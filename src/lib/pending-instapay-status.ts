'use client';

import { getBookingPaymentStatus } from '@/lib/api/bookings';
import {
  clearPendingInstapay,
  type PendingInstapay,
} from '@/lib/booking-success-cache';

/**
 * Asks the server whether the saved InstaPay booking still needs paying. Once
 * the supplier confirms it (or it is cancelled or deleted) the saved booking is
 * cleared and this returns true. Network errors count as still pending, so the
 * guest doesn't lose the way back to their booking while offline.
 */
export async function settlePendingInstapay(
  pending: PendingInstapay,
): Promise<boolean> {
  const phone = pending.booking.phone_number;
  if (typeof phone !== 'string' || !phone) return false;
  const result = await getBookingPaymentStatus(pending.booking.ID, phone);
  const settled = result.data
    ? result.data.status !== 'PENDING'
    : result.code === 'BOOKING_NOT_FOUND';
  if (settled) clearPendingInstapay();
  return settled;
}
