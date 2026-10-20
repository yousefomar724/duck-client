import { afterEach, describe, expect, it } from 'vitest';
import {
  cairoPickerToInstant,
  discountDraftError,
  instantToCairoPicker,
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
