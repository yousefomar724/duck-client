import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { findActiveUserById } from '@/server/services/user';
import { Booking } from '@/server/models/booking';
import { cancelBookingByStaff, BookingEditError } from '@/server/services/booking-edit';
import { errorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid booking ID');

  const user = await findActiveUserById(session.user_id);
  if (!user || !user.supplier_id) return errorResponse(403, 'user is not a supplier');

  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const booking = await Booking.findById(id);
  if (!booking) return errorResponse(404, 'booking not found');

  try {
    const updated = await cancelBookingByStaff(
      booking,
      {
        user_id: user.id,
        role: session.role,
        supplier_id: user.supplier_id.toString(),
      },
      body.reason,
    );
    const message =
      updated.status === 'REFUND_PENDING'
        ? 'Booking cancelled and set to refund pending.'
        : 'Booking cancelled.';
    return NextResponse.json({ message, booking: updated });
  } catch (err) {
    if (err instanceof BookingEditError) {
      return errorResponse(err.statusCode, err.message);
    }
    throw err;
  }
}
