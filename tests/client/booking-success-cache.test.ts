import { afterEach, describe, expect, it } from 'vitest';
import {
  PENDING_INSTAPAY_KEY,
  PENDING_INSTAPAY_TTL_MS,
  clearPendingInstapay,
  markPendingInstapayReceiptSent,
  readPendingInstapay,
  writePendingInstapay,
} from '@/lib/booking-success-cache';
import type { Booking } from '@/lib/types';

describe('pending payment cache', () => {
  const valid = { booking: { ID: 'booking-1', trip_id: 'trip-1', amount: 200, currency: 'EGP' }, chosenAmount: 100 };
  const stored = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({ ...valid, saved_at: Date.now(), ...extra });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('preserves valid pending bookings', () => {
    localStorage.setItem(PENDING_INSTAPAY_KEY, stored());
    expect(readPendingInstapay()).toEqual(valid);
  });

  it('survives the tab closing by living in localStorage', () => {
    writePendingInstapay(valid as unknown as { booking: Booking; chosenAmount: number });
    expect(sessionStorage.getItem(PENDING_INSTAPAY_KEY)).toBeNull();
    expect(readPendingInstapay()).toEqual(valid);
    clearPendingInstapay();
    expect(readPendingInstapay()).toBeNull();
  });

  it('remembers that the receipt was sent', () => {
    localStorage.setItem(PENDING_INSTAPAY_KEY, stored());
    markPendingInstapayReceiptSent();
    expect(readPendingInstapay()).toEqual({ ...valid, receiptSent: true });
  });

  it('expires after the TTL and removes the entry', () => {
    const savedAt = Date.now();
    localStorage.setItem(PENDING_INSTAPAY_KEY, stored({ saved_at: savedAt }));
    expect(readPendingInstapay(savedAt + PENDING_INSTAPAY_TTL_MS - 1)).toEqual(valid);
    expect(readPendingInstapay(savedAt + PENDING_INSTAPAY_TTL_MS + 1)).toBeNull();
    expect(localStorage.getItem(PENDING_INSTAPAY_KEY)).toBeNull();
  });

  it('drops bookings whose start time has passed', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    localStorage.setItem(
      PENDING_INSTAPAY_KEY,
      stored({ booking: { ...valid.booking, booking_date: past } }),
    );
    expect(readPendingInstapay()).toBeNull();
  });

  it.each([
    '{invalid json',
    JSON.stringify(valid),
    JSON.stringify({ booking: {}, chosenAmount: 100, saved_at: 1 }),
    JSON.stringify({ ...valid, saved_at: Date.now(), booking: { ...valid.booking, ID: {} } }),
    JSON.stringify({ ...valid, saved_at: Date.now(), booking: { ...valid.booking, currency: 'bad-currency' } }),
    JSON.stringify({ ...valid, saved_at: Date.now(), chosenAmount: -1 }),
  ])('ignores corrupt data: %s', (raw) => {
    localStorage.setItem(PENDING_INSTAPAY_KEY, raw);
    expect(readPendingInstapay()).toBeNull();
  });
});
