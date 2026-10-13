import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PENDING_INSTAPAY_KEY,
  writePendingInstapay,
  type PendingInstapay,
} from '@/lib/booking-success-cache';

const getBookingPaymentStatus = vi.fn();
vi.mock('@/lib/api/bookings', () => ({
  getBookingPaymentStatus: (...args: unknown[]) => getBookingPaymentStatus(...args),
}));

const { settlePendingInstapay } = await import('@/lib/pending-instapay-status');

const pending = {
  booking: { ID: 'booking-1', trip_id: 'trip-1', amount: 200, currency: 'EGP', phone_number: '+201000000000' },
  chosenAmount: 100,
} as unknown as PendingInstapay;

describe('settlePendingInstapay', () => {
  afterEach(() => {
    localStorage.clear();
    getBookingPaymentStatus.mockReset();
  });

  it('clears the saved booking once the supplier confirms it', async () => {
    writePendingInstapay(pending);
    getBookingPaymentStatus.mockResolvedValue({ data: { status: 'CONFIRMED' }, error: null });
    expect(await settlePendingInstapay(pending)).toBe(true);
    expect(getBookingPaymentStatus).toHaveBeenCalledWith('booking-1', '+201000000000');
    expect(localStorage.getItem(PENDING_INSTAPAY_KEY)).toBeNull();
  });

  it('clears it when the booking no longer exists', async () => {
    writePendingInstapay(pending);
    getBookingPaymentStatus.mockResolvedValue({ data: null, error: 'booking not found', code: 'BOOKING_NOT_FOUND' });
    expect(await settlePendingInstapay(pending)).toBe(true);
    expect(localStorage.getItem(PENDING_INSTAPAY_KEY)).toBeNull();
  });

  it('keeps it while still pending or when the request fails', async () => {
    writePendingInstapay(pending);
    getBookingPaymentStatus.mockResolvedValueOnce({ data: { status: 'PENDING' }, error: null });
    expect(await settlePendingInstapay(pending)).toBe(false);
    getBookingPaymentStatus.mockResolvedValueOnce({ data: null, error: 'Failed to fetch' });
    expect(await settlePendingInstapay(pending)).toBe(false);
    expect(localStorage.getItem(PENDING_INSTAPAY_KEY)).not.toBeNull();
  });
});
