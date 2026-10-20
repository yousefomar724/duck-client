import { minimumDeposit } from './pricing';

/** Stored and compared uppercase. Allowed: A–Z, 0–9, and dashes, 4–32 chars. */
export const DISCOUNT_CODE_PATTERN = /^[A-Z0-9-]{4,32}$/;

export type DiscountType = 'percentage' | 'fixed';
export type DiscountFundedBy = 'supplier' | 'platform';

export type DiscountErrorCode =
  | 'NOT_FOUND'
  | 'DISABLED'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'WRONG_SUPPLIER'
  | 'TRIP_NOT_ELIGIBLE'
  | 'CURRENCY_MISMATCH'
  | 'BELOW_MINIMUM'
  | 'USAGE_LIMIT_REACHED'
  | 'ALREADY_USED_BY_CUSTOMER'
  | 'INVALID_CODE'
  /** A once-per-customer code needs a phone number we can recognise. */
  | 'INVALID_PHONE';

export interface DiscountRule {
  type: DiscountType;
  value: number;
  max_discount?: number | null;
}

export interface AppliedDiscount {
  discount: number;
  total: number;
}

/**
 * Discount is rounded down to a whole currency unit and can never exceed the
 * subtotal, so the total never goes negative and we never give away more than
 * the stated amount. The caller passes the full booking subtotal, guide fee
 * included.
 */
export function applyDiscount(subtotal: number, rule: DiscountRule): AppliedDiscount {
  const base = Math.max(0, Number.isFinite(subtotal) ? subtotal : 0);
  let discount = 0;

  if (rule.type === 'percentage') {
    discount = Math.floor((base * rule.value) / 100);
    if (rule.max_discount != null && Number.isFinite(rule.max_discount)) {
      discount = Math.min(discount, rule.max_discount);
    }
  } else {
    discount = rule.value;
  }

  if (!Number.isFinite(discount) || discount < 0) discount = 0;
  discount = Math.floor(Math.min(discount, base));
  return { discount, total: base - discount };
}

export function normalizeDiscountCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  if (!DISCOUNT_CODE_PATTERN.test(code)) return null;
  return code;
}

export interface DiscountEligibilityCode {
  status: 'active' | 'disabled';
  deleted?: boolean;
  starts_at?: Date | null;
  expires_at: Date;
  supplier_id?: string | null;
  trip_ids?: string[];
  type: DiscountType;
  currency?: string | null;
  min_booking_amount?: number | null;
  usage_limit_total?: number | null;
  used_count: number;
}

export interface DiscountEligibilityContext {
  now: Date;
  supplierId: string;
  tripId: string;
  currency: string;
  subtotal: number;
  alreadyUsedByCustomer?: boolean;
}

export function checkCodeEligibility(
  code: DiscountEligibilityCode | null | undefined,
  ctx: DiscountEligibilityContext,
): { ok: true } | { ok: false; error: DiscountErrorCode } {
  if (!code || code.deleted) return { ok: false, error: 'NOT_FOUND' };
  if (code.status !== 'active') return { ok: false, error: 'DISABLED' };
  if (code.starts_at && ctx.now.getTime() < code.starts_at.getTime()) {
    return { ok: false, error: 'NOT_STARTED' };
  }
  // `now == expires_at` is already expired. A code is usable up to, but not at, expiry.
  if (ctx.now.getTime() >= code.expires_at.getTime()) {
    return { ok: false, error: 'EXPIRED' };
  }
  if (code.supplier_id && code.supplier_id !== ctx.supplierId) {
    return { ok: false, error: 'WRONG_SUPPLIER' };
  }
  const trips = code.trip_ids ?? [];
  if (trips.length > 0 && !trips.includes(ctx.tripId)) {
    return { ok: false, error: 'TRIP_NOT_ELIGIBLE' };
  }
  if (code.type === 'fixed' && code.currency && code.currency !== ctx.currency) {
    return { ok: false, error: 'CURRENCY_MISMATCH' };
  }
  if (code.min_booking_amount != null && ctx.subtotal < code.min_booking_amount) {
    return { ok: false, error: 'BELOW_MINIMUM' };
  }
  if (code.usage_limit_total != null && code.used_count >= code.usage_limit_total) {
    return { ok: false, error: 'USAGE_LIMIT_REACHED' };
  }
  if (ctx.alreadyUsedByCustomer) {
    return { ok: false, error: 'ALREADY_USED_BY_CUSTOMER' };
  }
  return { ok: true };
}

export type DiscountDisplayStatus =
  | 'active'
  | 'scheduled'
  | 'expired'
  | 'exhausted'
  | 'disabled';

export function discountDisplayStatus(
  code: {
    status: 'active' | 'disabled';
    starts_at?: Date | null;
    expires_at: Date;
    usage_limit_total?: number | null;
    used_count: number;
  },
  now = new Date(),
): DiscountDisplayStatus {
  if (code.status === 'disabled') return 'disabled';
  if (now.getTime() >= code.expires_at.getTime()) return 'expired';
  if (code.starts_at && now.getTime() < code.starts_at.getTime()) return 'scheduled';
  if (code.usage_limit_total != null && code.used_count >= code.usage_limit_total) {
    return 'exhausted';
  }
  return 'active';
}

/** Deposit is computed on the discounted total. A free booking has no deposit. */
export function discountedDeposit(total: number): number {
  return minimumDeposit(total);
}
