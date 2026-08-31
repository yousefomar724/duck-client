import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { findActiveUserById } from '@/server/services/user';
import { Booking } from '@/server/models/booking';
import { confirmBookingPayment } from '@/server/services/booking-payment';
import { errorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid booking ID');

  const user = await findActiveUserById(session.user_id);
  if (!user || !user.supplier_id) return errorResponse(403, 'user is not a supplier');

  const booking = await Booking.findById(id);
  if (!booking) return errorResponse(400, 'booking not found');

  if (booking.status !== 'PENDING') {
    return errorResponse(400, `cannot confirm booking with status: ${booking.status}`);
  }
  if (booking.supplier_id.toString() !== user.supplier_id.toString()) {
    return errorResponse(403, 'unauthorized: booking does not belong to your supplier account');
  }

  let body: { amount_paid?: number; note?: string } = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine — falls back to the declared/full amount below
  }

  const fallback = booking.declared_amount > 0 ? booking.declared_amount : booking.amount;
  const amountPaid = body.amount_paid && body.amount_paid > 0 ? body.amount_paid : fallback;

  if (amountPaid <= 0 || amountPaid > booking.amount) {
    return errorResponse(400, `invalid amount_paid: must be between 0 and ${booking.amount}`);
  }

  try {
    await confirmBookingPayment(booking, amountPaid, body.note ?? '');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to confirm payment';
    return errorResponse(500, message);
  }

  return NextResponse.json({ message: 'Manual payment confirmed successfully.', booking });
}
