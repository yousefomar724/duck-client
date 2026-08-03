import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { Booking } from '@/server/models/booking';
import { errorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

const CANCELLABLE_STATUSES = ['CONFIRMED', 'SUCCESS', 'PAID'];

/**
 * User self-cancel. Go gated this behind PaymentMethod === KASHIER (the
 * only method that had a refund gateway to fall back to); since this
 * deployment is manual/InstaPay-only (decision: drop Kashier), every
 * booking now follows this path — cancel here moves eligible bookings to
 * REFUND_PENDING for the admin to settle via POST /bookings/:id/refund.
 *
 * Strictly owner-only: the Go API had no ownership check, so any
 * authenticated user could cancel any booking by ID. Guest bookings carry a
 * null `user_id` and therefore have no self-cancel path at all. Admins use
 * POST /bookings/:id/admin-cancel instead.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid booking ID');

  const booking = await Booking.findById(id);
  if (!booking) return errorResponse(400, 'booking not found');

  // Checked before status/date so a non-owner cannot probe a booking's state
  // through the difference between error messages.
  if (booking.user_id?.toString() !== session.user_id) {
    return errorResponse(403, 'unauthorized: booking does not belong to you');
  }

  if (!CANCELLABLE_STATUSES.includes(booking.status)) {
    return errorResponse(400, `cannot cancel booking with status: ${booking.status}`);
  }

  const hoursUntil = (booking.booking_date.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil < 24) {
    return errorResponse(400, 'cannot cancel booking less than 24 hours before the trip');
  }

  booking.status = 'REFUND_PENDING';
  await booking.save();

  return NextResponse.json({
    message: 'Booking cancelled successfully. Refund request has been sent to admin.',
    booking,
  });
}
