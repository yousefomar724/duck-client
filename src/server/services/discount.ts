import { Types } from 'mongoose';
import type { DiscountErrorCode } from '@/lib/booking/discount';
import {
  applyDiscount,
  checkCodeEligibility,
  normalizeDiscountCode,
  type DiscountEligibilityCode,
  type DiscountRule,
} from '@/lib/booking/discount';
import { phoneToE164 } from '@/lib/booking/phone';
import type { BookingDiscount, BookingDoc } from '../models/booking';
import { Booking } from '../models/booking';
import { DiscountCode, type DiscountCodeDoc } from '../models/discount-code';
import { DiscountRedemption } from '../models/discount-redemption';
import { creditWalletBySupplierId } from './wallet';

export class DiscountApplyError extends Error {
  readonly code: DiscountErrorCode;

  constructor(code: DiscountErrorCode, public statusCode = 409) {
    super(code);
    this.name = 'DiscountApplyError';
    this.code = code;
  }
}

export interface DiscountRedeemIntent {
  code_id: string;
  once_per_customer: boolean;
  customer_key: string;
  user_id: string | null;
  discount_amount: number;
  usage_limit_total: number | null;
}

export interface PricedDiscount {
  subtotal: number;
  amount: number;
  discount: BookingDiscount;
  redeem: DiscountRedeemIntent;
}

export interface DiscountRelease {
  redemptionReleased: boolean;
  codeId?: string;
  /** The row this call released. An edited booking can hold several released rows. */
  redemptionId?: string;
  /** Wallet debit performed by this call. 0 when the caller debits the exposure itself. */
  walletDebited: number;
  /** Credit that was cleared on the booking, whether or not this call moved the wallet. */
  previousCredit: number;
}

/** Errors that say a typed code does not exist — what someone guessing codes sees. */
export function isDiscountGuessFailure(code: DiscountErrorCode): boolean {
  return code === 'NOT_FOUND' || code === 'INVALID_CODE';
}

export function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  );
}

export function customerKeyForPhone(phone: string): string {
  return phoneToE164(phone) ?? phone.trim();
}

export function toEligibilityCode(code: DiscountCodeDoc): DiscountEligibilityCode {
  return {
    status: code.status,
    deleted: Boolean(code.deletedAt),
    starts_at: code.starts_at,
    expires_at: code.expires_at,
    supplier_id: code.supplier_id ? code.supplier_id.toString() : null,
    trip_ids: (code.trip_ids ?? []).map((id) => id.toString()),
    type: code.type,
    currency: code.currency || null,
    min_booking_amount: code.min_booking_amount,
    usage_limit_total: code.usage_limit_total,
    used_count: code.used_count ?? 0,
  };
}

export async function customerAlreadyUsedCode(
  codeId: Types.ObjectId,
  customerKey: string,
): Promise<boolean> {
  const existing = await DiscountRedemption.findOne({
    code_id: codeId,
    customer_key: customerKey,
    status: 'active',
    once_per_customer: true,
  });
  return Boolean(existing);
}

/**
 * Loads a code and prices it against a subtotal. Does not increment `used_count`;
 * `redeemDiscountForBooking` does that atomically when the booking is saved.
 */
export async function priceDiscountCode(input: {
  rawCode: string;
  subtotal: number;
  supplierId: string;
  tripId: string;
  currency: string;
  phone: string;
  userId: string | null;
  now?: Date;
}): Promise<PricedDiscount> {
  const normalized = normalizeDiscountCode(input.rawCode);
  if (!normalized) throw new DiscountApplyError('INVALID_CODE', 400);

  const code = await DiscountCode.findOne({ code: normalized });
  if (!code) throw new DiscountApplyError('NOT_FOUND', 409);

  const customerKey = customerKeyForPhone(input.phone);
  const alreadyUsed =
    code.once_per_customer && customerKey
      ? await customerAlreadyUsedCode(code._id as Types.ObjectId, customerKey)
      : false;

  const eligibility = checkCodeEligibility(toEligibilityCode(code), {
    now: input.now ?? new Date(),
    supplierId: input.supplierId,
    tripId: input.tripId,
    currency: input.currency,
    subtotal: input.subtotal,
    alreadyUsedByCustomer: alreadyUsed,
  });
  if (!eligibility.ok) throw new DiscountApplyError(eligibility.error, 409);

  if (code.once_per_customer && !phoneToE164(input.phone)) {
    throw new DiscountApplyError('INVALID_PHONE', 400);
  }

  const rule: DiscountRule = {
    type: code.type,
    value: code.value,
    max_discount: code.max_discount,
  };
  const applied = applyDiscount(input.subtotal, rule);

  return {
    subtotal: input.subtotal,
    amount: applied.total,
    discount: {
      code_id: code._id as Types.ObjectId,
      code: code.code,
      type: code.type,
      value: code.value,
      max_discount: code.max_discount,
      funded_by: code.funded_by,
      amount: applied.discount,
    },
    redeem: {
      code_id: code.id,
      once_per_customer: code.once_per_customer,
      customer_key: customerKey,
      user_id: input.userId,
      discount_amount: applied.discount,
      usage_limit_total: code.usage_limit_total,
    },
  };
}

/** Reapplies a frozen snapshot. Expiry, limits, and status are not checked again. */
export function repriceFrozenDiscount(
  subtotal: number,
  discount: BookingDiscount | null | undefined,
): { discountAmount: number; total: number } {
  if (!discount) return { discountAmount: 0, total: subtotal };
  const applied = applyDiscount(subtotal, {
    type: discount.type,
    value: discount.value,
    max_discount: discount.max_discount,
  });
  return { discountAmount: applied.discount, total: applied.total };
}

/**
 * Atomically claims one use, then writes the redemption. A duplicate customer
 * key rolls the counter back. Callers delete the booking if a later step fails.
 */
export async function redeemDiscountForBooking(
  booking: BookingDoc,
  intent: DiscountRedeemIntent,
): Promise<void> {
  const now = new Date();
  const filter: Record<string, unknown> = {
    _id: intent.code_id,
    status: 'active',
    expires_at: { $gt: now },
    $or: [{ starts_at: null }, { starts_at: { $lte: now } }],
  };
  if (intent.usage_limit_total != null) {
    filter.used_count = { $lt: intent.usage_limit_total };
  }

  const updated = await DiscountCode.findOneAndUpdate(
    filter,
    { $inc: { used_count: 1 } },
    { new: true },
  );
  if (!updated) {
    const code = await DiscountCode.findById(intent.code_id);
    const eligibility = checkCodeEligibility(code ? toEligibilityCode(code) : null, {
      now,
      supplierId: booking.supplier_id.toString(),
      tripId: booking.trip_id.toString(),
      currency: booking.currency,
      subtotal: booking.subtotal || booking.amount,
      alreadyUsedByCustomer: false,
    });
    throw new DiscountApplyError(eligibility.ok ? 'USAGE_LIMIT_REACHED' : eligibility.error, 409);
  }

  try {
    await DiscountRedemption.create({
      code_id: updated._id,
      booking_id: booking._id,
      supplier_id: booking.supplier_id,
      customer_key: intent.customer_key,
      user_id: intent.user_id ? new Types.ObjectId(intent.user_id) : null,
      discount_amount: intent.discount_amount,
      once_per_customer: intent.once_per_customer,
      status: 'active',
    });
  } catch (err) {
    await DiscountCode.updateOne(
      { _id: updated._id, used_count: { $gt: 0 } },
      { $inc: { used_count: -1 } },
    );
    if (isDuplicateKeyError(err)) {
      throw new DiscountApplyError(
        intent.once_per_customer ? 'ALREADY_USED_BY_CUSTOMER' : 'USAGE_LIMIT_REACHED',
        409,
      );
    }
    throw err;
  }
}

/**
 * Gives the booking's active use back without touching the platform credit.
 * An edit that swaps or removes a code settles the credit itself.
 */
export async function releaseRedemption(
  booking: BookingDoc,
  reason: string,
): Promise<DiscountRelease> {
  const result: DiscountRelease = {
    redemptionReleased: false,
    walletDebited: 0,
    previousCredit: 0,
  };
  const redemption = await DiscountRedemption.findOneAndUpdate(
    { booking_id: booking._id, status: 'active' },
    { $set: { status: 'released', released_at: new Date(), released_reason: reason } },
  );
  if (redemption) {
    result.redemptionReleased = true;
    result.codeId = redemption.code_id.toString();
    result.redemptionId = redemption.id;
    await DiscountCode.updateOne(
      { _id: redemption.code_id, used_count: { $gt: 0 } },
      { $inc: { used_count: -1 } },
    );
  }
  return result;
}

/**
 * Gives a use back and, by default, takes the platform credit out of the wallet.
 * Safe to call twice: the second call finds nothing left to release.
 */
export async function releaseDiscount(
  booking: BookingDoc,
  reason: string,
  options: { debitWallet?: boolean } = {},
): Promise<DiscountRelease> {
  const debitWallet = options.debitWallet !== false;
  const result = await releaseRedemption(booking, reason);

  const credited = booking.platform_discount_credited ?? 0;
  if (credited > 0) {
    const claimed = await Booking.findOneAndUpdate(
      { _id: booking._id, platform_discount_credited: { $gt: 0 } },
      { $set: { platform_discount_credited: 0 } },
    );
    booking.platform_discount_credited = 0;
    if (claimed) {
      result.previousCredit = claimed.platform_discount_credited ?? credited;
      if (debitWallet && result.previousCredit > 0) {
        await creditWalletBySupplierId(booking.supplier_id.toString(), -result.previousCredit, {
          allowNegative: true,
        });
        result.walletDebited = result.previousCredit;
      }
    }
  }

  return result;
}

/** Pass a supplier to total only their bookings (one wallet) instead of every booking. */
export async function walletCreditBreakdown(supplierId?: string) {
  const rows = await Booking.aggregate<{
    _id: Types.ObjectId;
    customer_payments: number;
    platform_discount_credits: number;
  }>([
    ...(supplierId ? [{ $match: { supplier_id: new Types.ObjectId(supplierId) } }] : []),
    {
      $group: {
        _id: '$supplier_id',
        customer_payments: {
          $sum: {
            $cond: [
              { $in: ['$status', ['REFUNDED']] },
              0,
              {
                $max: [
                  0,
                  {
                    $subtract: [
                      { $ifNull: ['$amount_paid', 0] },
                      { $ifNull: ['$refund_owed', 0] },
                    ],
                  },
                ],
              },
            ],
          },
        },
        platform_discount_credits: {
          $sum: { $ifNull: ['$platform_discount_credited', 0] },
        },
      },
    },
  ]);
  return new Map(
    rows.map((row) => [
      row._id.toString(),
      {
        customer_payments: row.customer_payments ?? 0,
        platform_discount_credits: row.platform_discount_credits ?? 0,
      },
    ]),
  );
}

export async function undoReleaseDiscount(
  booking: BookingDoc,
  release: DiscountRelease,
): Promise<void> {
  if (release.redemptionReleased && release.codeId) {
    await DiscountRedemption.updateOne(
      release.redemptionId
        ? { _id: release.redemptionId, status: 'released' }
        : { booking_id: booking._id, status: 'released' },
      { $set: { status: 'active', released_at: null, released_reason: '' } },
    );
    await DiscountCode.updateOne({ _id: release.codeId }, { $inc: { used_count: 1 } });
  }
  if (release.previousCredit > 0) {
    booking.platform_discount_credited = release.previousCredit;
    await Booking.updateOne(
      { _id: booking._id },
      { $set: { platform_discount_credited: release.previousCredit } },
    );
  }
  if (release.walletDebited > 0) {
    await creditWalletBySupplierId(booking.supplier_id.toString(), release.walletDebited, {
      allowNegative: true,
    });
  }
}
