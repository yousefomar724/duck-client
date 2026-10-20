import { describe, expect, it } from 'vitest';
import {
  applyDiscount,
  checkCodeEligibility,
  discountDisplayStatus,
  discountedDeposit,
  normalizeDiscountCode,
  type DiscountEligibilityCode,
} from '@/lib/booking/discount';
import { computeBookingAmount } from '@/server/services/booking';
import { computeBookingStats } from '@/lib/bookings/stats';
import { discountAmount, subtotalOf, supplierEarnings } from '@/lib/bookings/payment';
import type { Booking, BookingStatus } from '@/lib/types';

function code(overrides: Partial<DiscountEligibilityCode> = {}): DiscountEligibilityCode {
  return {
    status: 'active',
    starts_at: null,
    expires_at: new Date('2026-12-31T00:00:00Z'),
    supplier_id: null,
    trip_ids: [],
    type: 'percentage',
    currency: null,
    min_booking_amount: null,
    usage_limit_total: null,
    used_count: 0,
    ...overrides,
  };
}

const ctx = {
  now: new Date('2026-06-01T12:00:00Z'),
  supplierId: 'sup-1',
  tripId: 'trip-1',
  currency: 'EGP',
  subtotal: 1000,
};

describe('applyDiscount', () => {
  it('takes 10% of 1000', () => {
    expect(applyDiscount(1000, { type: 'percentage', value: 10 })).toEqual({
      discount: 100,
      total: 900,
    });
  });

  it('rounds a percentage down', () => {
    expect(applyDiscount(333, { type: 'percentage', value: 15 })).toEqual({
      discount: 49,
      total: 284,
    });
  });

  it('allows 100% so the total is free', () => {
    expect(applyDiscount(180, { type: 'percentage', value: 100 })).toEqual({
      discount: 180,
      total: 0,
    });
  });

  it('caps a percentage and ignores the cap when the discount is smaller', () => {
    expect(applyDiscount(1000, { type: 'percentage', value: 20, max_discount: 50 })).toEqual({
      discount: 50,
      total: 950,
    });
    expect(applyDiscount(1000, { type: 'percentage', value: 10, max_discount: 200 })).toEqual({
      discount: 100,
      total: 900,
    });
  });

  it('subtracts a fixed amount and never goes below zero', () => {
    expect(applyDiscount(1000, { type: 'fixed', value: 200 })).toEqual({
      discount: 200,
      total: 800,
    });
    expect(applyDiscount(150, { type: 'fixed', value: 200 })).toEqual({
      discount: 150,
      total: 0,
    });
  });

  it('discounts the guide fee because it is part of the subtotal', () => {
    const priced = computeBookingAmount(
      {
        is_tour: false,
        price: 180,
        foreigner_price: 0,
        guide_price: 100,
        guide_mandatory: false,
      },
      { quantity: 1, local_guests: 1, foreigner_guests: 0, wants_guide: true },
    );
    expect(priced.amount).toBe(280);
    expect(applyDiscount(priced.amount, { type: 'percentage', value: 10 })).toEqual({
      discount: 28,
      total: 252,
    });
  });
});

describe('checkCodeEligibility', () => {
  it('passes when the subtotal equals the minimum and fails one below', () => {
    const rule = code({ min_booking_amount: 500 });
    expect(checkCodeEligibility(rule, { ...ctx, subtotal: 500 }).ok).toBe(true);
    expect(checkCodeEligibility(rule, { ...ctx, subtotal: 499 })).toEqual({
      ok: false,
      error: 'BELOW_MINIMUM',
    });
  });

  it('treats the exact start and expiry instants as the boundaries', () => {
    const starts = new Date('2026-06-01T12:00:00.000Z');
    const expires = new Date('2026-07-01T00:00:00.000Z');
    const rule = code({ starts_at: starts, expires_at: expires });
    expect(checkCodeEligibility(rule, { ...ctx, now: starts }).ok).toBe(true);
    expect(checkCodeEligibility(rule, { ...ctx, now: new Date(starts.getTime() - 1) })).toEqual({
      ok: false,
      error: 'NOT_STARTED',
    });
    expect(checkCodeEligibility(rule, { ...ctx, now: expires })).toEqual({
      ok: false,
      error: 'EXPIRED',
    });
  });

  it('rejects disabled, deleted, the wrong supplier, and a trip outside the list', () => {
    expect(checkCodeEligibility(code({ status: 'disabled' }), ctx)).toEqual({
      ok: false,
      error: 'DISABLED',
    });
    expect(checkCodeEligibility(code({ deleted: true }), ctx)).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
    expect(checkCodeEligibility(code({ supplier_id: 'other' }), ctx)).toEqual({
      ok: false,
      error: 'WRONG_SUPPLIER',
    });
    expect(checkCodeEligibility(code({ trip_ids: ['trip-2'] }), ctx)).toEqual({
      ok: false,
      error: 'TRIP_NOT_ELIGIBLE',
    });
    expect(checkCodeEligibility(code({ supplier_id: null, trip_ids: [] }), ctx).ok).toBe(true);
  });

  it('requires the booking currency to match a fixed code', () => {
    expect(
      checkCodeEligibility(code({ type: 'fixed', currency: 'USD' }), ctx),
    ).toEqual({ ok: false, error: 'CURRENCY_MISMATCH' });
    expect(checkCodeEligibility(code({ type: 'percentage', currency: 'USD' }), ctx).ok).toBe(true);
  });

  it('reports a reached usage limit and a customer who already used the code', () => {
    expect(checkCodeEligibility(code({ usage_limit_total: 2, used_count: 2 }), ctx)).toEqual({
      ok: false,
      error: 'USAGE_LIMIT_REACHED',
    });
    expect(checkCodeEligibility(code(), { ...ctx, alreadyUsedByCustomer: true })).toEqual({
      ok: false,
      error: 'ALREADY_USED_BY_CUSTOMER',
    });
  });
});

describe('normalizeDiscountCode', () => {
  it('trims and uppercases a code', () => {
    expect(normalizeDiscountCode(' summer10 ')).toBe('SUMMER10');
  });

  it('rejects characters outside the allowed set and short codes', () => {
    expect(normalizeDiscountCode('SUM MER')).toBeNull();
    expect(normalizeDiscountCode('AB')).toBeNull();
    expect(normalizeDiscountCode('OK!')).toBeNull();
  });
});

describe('discountedDeposit', () => {
  it('uses the discounted total and is zero when the booking is free', () => {
    const priced = applyDiscount(1000, { type: 'percentage', value: 10 });
    expect(discountedDeposit(priced.total)).toBe(450);
    expect(discountedDeposit(0)).toBe(0);
  });
});

describe('discount display and booking helpers', () => {
  it('labels scheduled, expired, and exhausted codes', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    expect(
      discountDisplayStatus(
        {
          status: 'active',
          starts_at: new Date('2026-07-01T00:00:00Z'),
          expires_at: new Date('2026-08-01T00:00:00Z'),
          used_count: 0,
          usage_limit_total: null,
        },
        now,
      ),
    ).toBe('scheduled');
    expect(
      discountDisplayStatus(
        {
          status: 'active',
          expires_at: now,
          used_count: 0,
          usage_limit_total: null,
        },
        now,
      ),
    ).toBe('expired');
    expect(
      discountDisplayStatus(
        {
          status: 'active',
          expires_at: new Date('2026-12-01T00:00:00Z'),
          used_count: 3,
          usage_limit_total: 3,
        },
        now,
      ),
    ).toBe('exhausted');
  });

  it('reads an old booking subtotal as its amount', () => {
    expect(subtotalOf({ amount: 180 })).toBe(180);
    expect(subtotalOf({ amount: 0, subtotal: 180 })).toBe(180);
    expect(discountAmount({})).toBe(0);
    expect(
      supplierEarnings({ amount_paid: 800, refund_owed: 0, platform_discount_credited: 200 }),
    ).toBe(1000);
  });

  it('splits supplier-funded and platform-funded discounts in booking stats', () => {
    const row = (
      status: BookingStatus,
      amount: number,
      discount: Booking['discount'],
    ) => ({ status, amount, amount_paid: 0, refund_owed: 0, discount });
    const stats = computeBookingStats([
      row('CONFIRMED', 900, {
        code_id: '1',
        code: 'SUP',
        type: 'percentage',
        value: 10,
        funded_by: 'supplier',
        amount: 100,
      }),
      row('CONFIRMED', 800, {
        code_id: '2',
        code: 'DUCK',
        type: 'fixed',
        value: 200,
        funded_by: 'platform',
        amount: 200,
      }),
      row('CONFIRMED', 180, null),
      row('CANCELLED', 0, {
        code_id: '3',
        code: 'OLD',
        type: 'fixed',
        value: 50,
        funded_by: 'supplier',
        amount: 50,
      }),
    ]);
    expect(stats.discountsTotal).toBe(300);
    expect(stats.supplierFundedDiscounts).toBe(100);
    expect(stats.platformFundedDiscounts).toBe(200);
    expect(stats.bookedRevenue).toBe(900 + 800 + 180);
  });
});
