import { describe, expect, it } from 'vitest';
import { PENDING_INSTAPAY_KEY, readPendingInstapay } from '@/lib/booking-success-cache';

describe('pending payment cache', () => {
  const valid = { booking: { ID: 'booking-1', trip_id: 'trip-1', amount: 200, currency: 'EGP' }, chosenAmount: 100 };

  it('preserves valid pending bookings', () => {
    sessionStorage.setItem(PENDING_INSTAPAY_KEY, JSON.stringify(valid));
    expect(readPendingInstapay()).toEqual(valid);
  });

  it.each([
    '{invalid json',
    JSON.stringify({ booking: {}, chosenAmount: 100 }),
    JSON.stringify({ ...valid, booking: { ...valid.booking, ID: {} } }),
    JSON.stringify({ ...valid, booking: { ...valid.booking, currency: 'bad-currency' } }),
    JSON.stringify({ ...valid, chosenAmount: -1 }),
  ])('ignores corrupt data: %s', (raw) => {
    sessionStorage.setItem(PENDING_INSTAPAY_KEY, raw);
    expect(readPendingInstapay()).toBeNull();
  });
});
