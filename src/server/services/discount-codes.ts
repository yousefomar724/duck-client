import { Types } from 'mongoose';
import { z } from 'zod/v3';
import {
  discountDisplayStatus,
  discountedDeposit,
  normalizeDiscountCode,
  type DiscountDisplayStatus,
} from '@/lib/booking/discount';
import { sameMinute } from '@/lib/booking/discount-form';
import { computeBookingAmount } from './booking';
import { Trip } from '../models/trip';
import { Supplier } from '../models/supplier';
import { isValidObjectId } from '../lib/object-id';
import { Booking } from '../models/booking';
import { DiscountCode, type DiscountCodeDoc } from '../models/discount-code';
import { DiscountRedemption } from '../models/discount-redemption';
import { findActiveUserById } from './user';
import type { Session } from '../auth/guard';
import {
  DiscountApplyError,
  isDuplicateKeyError,
  priceDiscountCode,
} from './discount';

const writeSchema = z.object({
  code: z.string().min(1),
  description: z.string().max(500).optional(),
  type: z.enum(['percentage', 'fixed']),
  value: z.number(),
  currency: z.string().optional(),
  max_discount: z.number().positive().nullable().optional(),
  min_booking_amount: z.number().positive().nullable().optional(),
  starts_at: z.string().nullable().optional(),
  expires_at: z.string().min(1),
  usage_limit_total: z.number().int().positive().nullable().optional(),
  once_per_customer: z.boolean().optional(),
  supplier_id: z.string().nullable().optional(),
  trip_ids: z.array(z.string()).optional(),
  status: z.enum(['active', 'disabled']).optional(),
});

export type DiscountWriteInput = z.infer<typeof writeSchema>;

export function parseDiscountWrite(body: unknown): DiscountWriteInput | null {
  const parsed = writeSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

function parseInstant(value: string | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export class DiscountCodeError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'DiscountCodeError';
  }
}

interface Actor {
  session: Session;
  supplierId: string | null;
}

export async function loadDiscountActor(session: Session): Promise<Actor> {
  if (session.role !== 1 && session.role !== 2) {
    throw new DiscountCodeError('Unauthorized', 403);
  }
  const user = await findActiveUserById(session.user_id);
  if (!user) throw new DiscountCodeError('user not found', 403);
  if (session.role === 1 && !user.supplier_id) {
    throw new DiscountCodeError('user is not a supplier', 403);
  }
  return {
    session,
    supplierId: user.supplier_id ? user.supplier_id.toString() : null,
  };
}

function canMutate(actor: Actor, code: DiscountCodeDoc): boolean {
  if (actor.session.role === 2) return true;
  if (!actor.supplierId) return false;
  if (code.funded_by === 'platform' || code.created_by_role === 2) return false;
  return code.supplier_id?.toString() === actor.supplierId;
}

async function assertSupplierExists(supplierId: string) {
  if (!isValidObjectId(supplierId)) throw new DiscountCodeError('invalid supplier_id', 400);
  const supplier = await Supplier.findById(supplierId).select('_id');
  if (!supplier) throw new DiscountCodeError('supplier not found', 400);
}

async function assertTripsBelong(tripIds: string[], supplierId: string | null) {
  if (tripIds.length === 0) return;
  if (tripIds.some((id) => !isValidObjectId(id))) {
    throw new DiscountCodeError('invalid trip id', 400);
  }
  const unique = [...new Set(tripIds)];
  const trips = await Trip.find({ _id: { $in: unique } });
  if (trips.length !== unique.length) {
    throw new DiscountCodeError('one or more trips were not found', 400);
  }
  if (supplierId) {
    const foreign = trips.some((trip) => trip.supplier_id.toString() !== supplierId);
    if (foreign) throw new DiscountCodeError('trip does not belong to this supplier', 403);
  }
}

function validateEconomics(
  input: DiscountWriteInput,
  dates: { starts: Date | null; expires: Date },
  options: { allowPastExpiry?: boolean } = {},
) {
  if (input.type === 'percentage') {
    if (input.value < 1 || input.value > 100) {
      throw new DiscountCodeError('percentage value must be between 1 and 100', 400);
    }
  } else if (!(input.value > 0)) {
    throw new DiscountCodeError('fixed value must be greater than 0', 400);
  }
  if (input.type === 'fixed' && !input.currency?.trim()) {
    throw new DiscountCodeError('currency is required for a fixed discount', 400);
  }
  if (!options.allowPastExpiry && dates.expires.getTime() <= Date.now()) {
    throw new DiscountCodeError('expires_at must be in the future', 400);
  }
  if (dates.starts && dates.starts.getTime() >= dates.expires.getTime()) {
    throw new DiscountCodeError('starts_at must be before expires_at', 400);
  }
}

export async function serializeDiscountCode(
  code: DiscountCodeDoc,
  extras: { pendingUses?: number; readOnly?: boolean } = {},
) {
  const json = code.toJSON() as Record<string, unknown>;
  return {
    ...json,
    display_status: discountDisplayStatus(code) satisfies DiscountDisplayStatus,
    pending_uses: extras.pendingUses ?? 0,
    read_only: extras.readOnly ?? false,
  };
}

async function pendingUsesByCode(ids: Types.ObjectId[], supplierId: string | null) {
  if (ids.length === 0) return new Map<string, number>();
  const match: Record<string, unknown> = { code_id: { $in: ids }, status: 'active' };
  if (supplierId) match.supplier_id = new Types.ObjectId(supplierId);
  const rows = await DiscountRedemption.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: match },
    {
      $lookup: {
        from: 'bookings',
        localField: 'booking_id',
        foreignField: '_id',
        as: 'booking',
      },
    },
    { $unwind: '$booking' },
    { $match: { 'booking.status': 'PENDING', 'booking.deletedAt': null } },
    { $group: { _id: '$code_id', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}

export async function listDiscountCodes(
  actor: Actor,
  query: { supplierId?: string | null; status?: string | null; creator?: string | null },
) {
  const filter: Record<string, unknown> = {};
  if (actor.session.role === 1) {
    const trips = await Trip.find({ supplier_id: actor.supplierId }).select('_id');
    const tripIds = trips.map((trip) => trip._id);
    filter.$or = [
      { supplier_id: actor.supplierId },
      { supplier_id: null, trip_ids: { $size: 0 } },
      { supplier_id: null, trip_ids: { $in: tripIds } },
    ];
  } else if (query.supplierId) {
    filter.supplier_id = query.supplierId === 'platform' ? null : query.supplierId;
  }
  if (query.creator === 'admin') filter.created_by_role = 2;
  if (query.creator === 'supplier') filter.created_by_role = 1;

  const codes = await DiscountCode.find(filter).sort({ created_at: -1 });
  const pending = await pendingUsesByCode(
    codes.map((code) => code._id as Types.ObjectId),
    actor.session.role === 1 ? actor.supplierId : null,
  );
  const visible = query.status
    ? codes.filter((code) => discountDisplayStatus(code) === query.status)
    : codes;

  return Promise.all(
    visible.map((code) =>
      serializeDiscountCode(code, {
        pendingUses: pending.get(code.id) ?? 0,
        readOnly: !canMutate(actor, code),
      }),
    ),
  );
}

export async function createDiscountCode(actor: Actor, input: DiscountWriteInput) {
  const code = normalizeDiscountCode(input.code);
  if (!code) throw new DiscountCodeError('invalid code', 400);

  const starts = parseInstant(input.starts_at);
  const expires = parseInstant(input.expires_at);
  if (input.starts_at && !starts) throw new DiscountCodeError('invalid starts_at', 400);
  if (!expires) throw new DiscountCodeError('invalid expires_at', 400);
  validateEconomics(input, { starts, expires });

  let supplierId: string | null = null;
  let fundedBy: 'supplier' | 'platform' = 'platform';
  if (actor.session.role === 1) {
    supplierId = actor.supplierId;
    fundedBy = 'supplier';
  } else if (input.supplier_id) {
    await assertSupplierExists(input.supplier_id);
    supplierId = input.supplier_id;
    fundedBy = 'platform';
  }

  const tripIds = input.trip_ids ?? [];
  await assertTripsBelong(tripIds, supplierId);

  try {
    const doc = await DiscountCode.create({
      code,
      description: input.description?.trim() ?? '',
      type: input.type,
      value: input.value,
      currency: input.type === 'fixed' ? input.currency!.trim().toUpperCase() : '',
      max_discount: input.type === 'percentage' ? (input.max_discount ?? null) : null,
      min_booking_amount: input.min_booking_amount ?? null,
      starts_at: starts,
      expires_at: expires,
      usage_limit_total: input.usage_limit_total ?? null,
      once_per_customer: input.once_per_customer ?? false,
      used_count: 0,
      supplier_id: supplierId,
      trip_ids: tripIds,
      funded_by: fundedBy,
      created_by_user_id: actor.session.user_id,
      created_by_role: actor.session.role,
      status: input.status ?? 'active',
    });
    return serializeDiscountCode(doc, { readOnly: false });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new DiscountCodeError('a code with this name already exists', 409);
    }
    throw err;
  }
}

const LOCKED_FIELDS = ['code', 'type', 'value', 'currency', 'supplier_id', 'trip_ids'] as const;

export async function updateDiscountCode(
  actor: Actor,
  id: string,
  input: Partial<DiscountWriteInput>,
) {
  const code = await DiscountCode.findById(id);
  if (!code) throw new DiscountCodeError('discount code not found', 404);
  if (!canMutate(actor, code)) throw new DiscountCodeError('Unauthorized', 403);

  if ((code.used_count ?? 0) > 0) {
    for (const field of LOCKED_FIELDS) {
      if (input[field] === undefined) continue;
      const current =
        field === 'supplier_id'
          ? (code.supplier_id?.toString() ?? null)
          : field === 'trip_ids'
            ? (code.trip_ids ?? []).map((tripId: { toString(): string }) => tripId.toString())
            : field === 'code'
              ? code.code
              : code[field];
      const next = field === 'code' && typeof input.code === 'string'
        ? normalizeDiscountCode(input.code)
        : input[field];
      if (JSON.stringify(next ?? null) !== JSON.stringify(current ?? null)) {
        throw new DiscountCodeError(`${field} cannot change after the code has been used`, 400);
      }
    }
  }

  if (input.usage_limit_total != null && input.usage_limit_total < (code.used_count ?? 0)) {
    throw new DiscountCodeError('usage limit cannot be below the number of uses', 400);
  }

  const nextType = input.type ?? code.type;
  const nextValue = input.value ?? code.value;
  const starts = input.starts_at !== undefined ? parseInstant(input.starts_at) : code.starts_at;
  const expires = input.expires_at !== undefined ? parseInstant(input.expires_at) : code.expires_at;
  if (input.starts_at && !starts) throw new DiscountCodeError('invalid starts_at', 400);
  if (!expires) throw new DiscountCodeError('invalid expires_at', 400);

  validateEconomics(
    {
      code: code.code,
      type: nextType,
      value: nextValue,
      currency: input.currency ?? code.currency,
      expires_at: expires.toISOString(),
    },
    { starts, expires },
    // Re-sending the expiry a code already has is not a change: the form always
    // sends it, and an expired code must still accept a new note or limit.
    { allowPastExpiry: input.expires_at === undefined || sameMinute(expires, code.expires_at) },
  );

  if (input.code !== undefined && (code.used_count ?? 0) === 0) {
    const normalized = normalizeDiscountCode(input.code);
    if (!normalized) throw new DiscountCodeError('invalid code', 400);
    code.code = normalized;
  }
  if (input.description !== undefined) code.description = input.description.trim();
  if (input.type !== undefined) code.type = input.type;
  if (input.value !== undefined) code.value = input.value;
  if (nextType === 'fixed') {
    const currency = (input.currency ?? code.currency).trim().toUpperCase();
    if (!currency) throw new DiscountCodeError('currency is required for a fixed discount', 400);
    code.currency = currency;
  } else {
    code.currency = '';
  }
  if (input.max_discount !== undefined) {
    code.max_discount = nextType === 'percentage' ? input.max_discount : null;
  }
  if (input.min_booking_amount !== undefined) code.min_booking_amount = input.min_booking_amount;
  if (input.starts_at !== undefined) code.starts_at = starts;
  if (input.expires_at !== undefined && !sameMinute(expires, code.expires_at)) {
    code.expires_at = expires;
  }
  if (input.usage_limit_total !== undefined) code.usage_limit_total = input.usage_limit_total;
  if (input.once_per_customer !== undefined) code.once_per_customer = input.once_per_customer;
  if (input.status !== undefined) code.status = input.status;

  const unused = (code.used_count ?? 0) === 0;
  const previousOwner = code.supplier_id ? code.supplier_id.toString() : null;
  if (actor.session.role === 2 && input.supplier_id !== undefined && unused) {
    if (input.supplier_id) await assertSupplierExists(input.supplier_id);
    code.supplier_id = input.supplier_id ? new Types.ObjectId(input.supplier_id) : null;
  }
  const owner = code.supplier_id ? code.supplier_id.toString() : null;
  if (input.trip_ids !== undefined && unused) {
    await assertTripsBelong(input.trip_ids, owner);
    code.trip_ids = input.trip_ids.map((tripId) => new Types.ObjectId(tripId));
  } else if (owner !== previousOwner) {
    // A new supplier keeps the old trip list only if every trip is theirs.
    await assertTripsBelong(
      (code.trip_ids ?? []).map((tripId: { toString(): string }) => tripId.toString()),
      owner,
    );
  }

  try {
    await code.save();
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new DiscountCodeError('a code with this name already exists', 409);
    }
    throw err;
  }
  return serializeDiscountCode(code, { readOnly: false });
}

export async function deleteDiscountCode(actor: Actor, id: string) {
  const code = await DiscountCode.findById(id);
  if (!code) throw new DiscountCodeError('discount code not found', 404);
  if (!canMutate(actor, code)) throw new DiscountCodeError('Unauthorized', 403);

  if ((code.used_count ?? 0) > 0) {
    code.status = 'disabled';
    await code.save();
    return { deleted: false, disabled: true, code: await serializeDiscountCode(code) };
  }

  code.deletedAt = new Date();
  await code.save();
  return { deleted: true, disabled: false };
}

export async function listRedemptions(actor: Actor, id: string) {
  const code = await DiscountCode.findById(id);
  if (!code) throw new DiscountCodeError('discount code not found', 404);
  const readable =
    actor.session.role === 2 ||
    code.supplier_id?.toString() === actor.supplierId ||
    code.supplier_id == null;
  if (!readable) throw new DiscountCodeError('Unauthorized', 403);
  if (actor.session.role === 1 && code.supplier_id == null) {
    const trips = await Trip.find({ supplier_id: actor.supplierId }).select('_id');
    const mine = new Set(trips.map((trip) => trip.id));
    const aimed =
      (code.trip_ids ?? []).length === 0 ||
      code.trip_ids.some((tripId: { toString(): string }) => mine.has(tripId.toString()));
    if (!aimed) throw new DiscountCodeError('Unauthorized', 403);
  }

  // A platform-wide code is shared by every supplier, so a supplier only ever
  // sees the redemptions on their own bookings — never another supplier's
  // customers.
  const redemptionFilter: Record<string, unknown> = { code_id: code._id };
  if (actor.session.role === 1) redemptionFilter.supplier_id = actor.supplierId;
  const redemptions = await DiscountRedemption.find(redemptionFilter).sort({ created_at: -1 });
  const bookingIds = redemptions.map((row) => row.booking_id);
  const bookings = await Booking.find({ _id: { $in: bookingIds } }).select(
    'full_name phone_number status amount currency booking_date',
  );
  const byId = new Map(bookings.map((booking) => [booking.id, booking]));

  return redemptions.map((row) => {
    const booking = byId.get(row.booking_id.toString());
    return {
      ...row.toJSON(),
      pending: booking?.status === 'PENDING' && row.status === 'active',
      booking: booking
        ? {
            id: booking.id,
            full_name: booking.full_name,
            phone_number: booking.phone_number,
            status: booking.status,
            amount: booking.amount,
            currency: booking.currency,
            booking_date: booking.booking_date,
          }
        : null,
    };
  });
}

const validateSchema = z.object({
  code: z.string().min(1),
  trip_id: z.string().min(1),
  phone_number: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
  local_guests: z.number().int().min(0).optional(),
  foreigner_guests: z.number().int().min(0).optional(),
  duration: z.number().int().min(1).optional(),
  wants_guide: z.boolean().optional(),
});

export function parseValidateBody(body: unknown) {
  const parsed = validateSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

export async function validateDiscountCode(
  body: z.infer<typeof validateSchema>,
  userId: string | null,
) {
  const trip = isValidObjectId(body.trip_id) ? await Trip.findById(body.trip_id) : null;
  if (!trip) throw new DiscountCodeError('trip not found', 404);
  const phone = body.phone_number ?? body.phone ?? '';
  if (!phone) throw new DiscountCodeError('phone is required', 400);

  const priced = computeBookingAmount(
    {
      is_tour: trip.is_tour,
      price: trip.price,
      foreigner_price: trip.foreigner_price,
      guide_price: trip.guide_price,
      guide_mandatory: trip.guide_mandatory,
    },
    body,
  );

  try {
    const result = await priceDiscountCode({
      rawCode: body.code,
      subtotal: priced.amount,
      supplierId: trip.supplier_id.toString(),
      tripId: trip.id,
      currency: trip.currency,
      phone,
      userId,
    });
    return {
      subtotal: result.subtotal,
      discount: result.discount.amount,
      total: result.amount,
      min_deposit: discountedDeposit(result.amount),
      code: result.discount.code,
      funded_by: result.discount.funded_by,
    };
  } catch (err) {
    if (err instanceof DiscountApplyError) throw err;
    throw err;
  }
}
