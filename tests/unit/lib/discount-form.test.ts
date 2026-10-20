import { afterEach, describe, expect, it } from 'vitest';
import {
  cairoPickerToInstant,
  discountDraftError,
  discountKindOf,
  discountRuleFor,
  expiryInDays,
  generateDiscountCode,
  instantToCairoPicker,
  isValidDraftCode,
  previewDiscount,
  sameMinute,
} from '@/lib/booking/discount-form';

const originalTz = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTz;
});

describe('Cairo expiry picker conversion', () => {
  // A browser outside Egypt used to shift the expiry by its own offset on
  // every save, because loading read local time and saving wrote Cairo time.
  for (const tz of ['Africa/Cairo', 'America/New_York', 'Asia/Tokyo', 'UTC']) {
    it(`opens and saves an expiry without moving it (${tz})`, () => {
      process.env.TZ = tz;
      // 10:30 in Cairo, which is UTC+2 in November.
      const stored = new Date('2026-11-20T08:30:00.000Z');
      const picked = instantToCairoPicker(stored.toISOString());
      expect(picked?.getHours()).toBe(10);
      expect(picked?.getMinutes()).toBe(30);
      expect(cairoPickerToInstant(picked)?.toISOString()).toBe(stored.toISOString());
    });
  }

  it('treats an empty value as no date', () => {
    expect(instantToCairoPicker(null)).toBeUndefined();
    expect(instantToCairoPicker('not a date')).toBeUndefined();
    expect(cairoPickerToInstant(undefined)).toBeNull();
  });

  it('compares instants at minute precision', () => {
    expect(sameMinute('2026-11-20T08:30:59.999Z', '2026-11-20T08:30:00.000Z')).toBe(true);
    expect(sameMinute('2026-11-20T08:31:00.000Z', '2026-11-20T08:30:00.000Z')).toBe(false);
    expect(sameMinute(null, null)).toBe(true);
    expect(sameMinute(null, '2026-11-20T08:30:00.000Z')).toBe(false);
  });
});

describe('discountDraftError', () => {
  const now = new Date('2026-10-20T12:00:00.000Z');
  const base = { type: 'percentage' as const, value: 10, currency: '' };

  it('rejects a past expiry on a new code', () => {
    expect(
      discountDraftError({ ...base, expiresAt: new Date('2026-10-01T00:00:00.000Z') }, now),
    ).toBe('pastExpiry');
  });

  it('accepts an expired code whose expiry is left as it was', () => {
    const current = '2026-10-01T09:15:42.000Z';
    expect(
      discountDraftError(
        { ...base, expiresAt: new Date('2026-10-01T09:15:00.000Z'), currentExpiresAt: current },
        now,
      ),
    ).toBeNull();
  });

  it('rejects moving an expired code to another past date', () => {
    expect(
      discountDraftError(
        {
          ...base,
          expiresAt: new Date('2026-09-01T09:15:00.000Z'),
          currentExpiresAt: '2026-10-01T09:15:00.000Z',
        },
        now,
      ),
    ).toBe('pastExpiry');
  });

  it('checks percentage range and fixed currency', () => {
    const expiresAt = new Date('2026-12-01T00:00:00.000Z');
    expect(discountDraftError({ ...base, value: 101, expiresAt }, now)).toBe('percentRange');
    expect(
      discountDraftError({ type: 'fixed', value: 50, currency: ' ', expiresAt }, now),
    ).toBe('currencyRequired');
  });
});

describe('discount kinds', () => {
  it('reads a 100% percentage code as a free booking', () => {
    expect(discountKindOf('percentage', 100)).toBe('free');
    expect(discountKindOf('percentage', 99)).toBe('percentage');
    expect(discountKindOf('fixed', 100)).toBe('fixed');
  });

  it('saves free as 100% with no cap, and drops the cap from fixed', () => {
    expect(discountRuleFor('free', 7, 50)).toEqual({ type: 'percentage', value: 100, max_discount: null });
    expect(discountRuleFor('fixed', 50, 20)).toEqual({ type: 'fixed', value: 50, max_discount: null });
    expect(discountRuleFor('percentage', 20, 200)).toEqual({
      type: 'percentage',
      value: 20,
      max_discount: 200,
    });
  });
});

describe('generateDiscountCode', () => {
  it('makes an 8-character code the API accepts, without look-alike characters', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateDiscountCode();
      expect(code).toMatch(/^[A-Z2-9]{8}$/);
      expect(code).not.toMatch(/[01IO]/);
      expect(isValidDraftCode(code)).toBe(true);
    }
  });

  it('accepts typed codes the way the server normalises them', () => {
    expect(isValidDraftCode('  summer-25 ')).toBe(true);
    expect(isValidDraftCode('abc')).toBe(false);
    expect(isValidDraftCode('SUMMER 25')).toBe(false);
  });
});

describe('expiryInDays', () => {
  for (const tz of ['Africa/Cairo', 'America/New_York']) {
    it(`ends on 23:59 Cairo time, N days ahead (${tz})`, () => {
      process.env.TZ = tz;
      // 01:00 on 21 Oct in Cairo is still 20 Oct in New York.
      const now = new Date('2026-10-20T22:00:00.000Z');
      const picked = expiryInDays(7, now);
      expect(cairoPickerToInstant(picked)?.toISOString()).toBe('2026-10-28T20:59:00.000Z');
    });
  }
});

describe('previewDiscount', () => {
  const base = { maxDiscount: null, minBooking: null };

  it('prices each kind like checkout', () => {
    expect(previewDiscount({ ...base, kind: 'percentage', value: 20, subtotal: 1000 })).toMatchObject({
      discount: 200,
      total: 800,
      capped: false,
    });
    expect(previewDiscount({ ...base, kind: 'fixed', value: 50, subtotal: 180 })).toMatchObject({
      discount: 50,
      total: 130,
    });
    expect(previewDiscount({ ...base, kind: 'fixed', value: 500, subtotal: 180 })).toMatchObject({
      discount: 180,
      total: 0,
    });
    expect(previewDiscount({ ...base, kind: 'free', value: 0, subtotal: 180 })).toMatchObject({
      discount: 180,
      total: 0,
    });
  });

  it('flags a cap that applies and a booking under the minimum', () => {
    expect(
      previewDiscount({ kind: 'percentage', value: 20, maxDiscount: 100, minBooking: null, subtotal: 1000 }),
    ).toMatchObject({ discount: 100, total: 900, capped: true });
    expect(
      previewDiscount({ kind: 'percentage', value: 20, maxDiscount: 500, minBooking: null, subtotal: 1000 }),
    ).toMatchObject({ discount: 200, capped: false });
    expect(
      previewDiscount({ kind: 'fixed', value: 50, maxDiscount: null, minBooking: 500, subtotal: 499 }).belowMinimum,
    ).toBe(true);
    expect(
      previewDiscount({ kind: 'fixed', value: 50, maxDiscount: null, minBooking: 500, subtotal: 500 }).belowMinimum,
    ).toBe(false);
  });
});
