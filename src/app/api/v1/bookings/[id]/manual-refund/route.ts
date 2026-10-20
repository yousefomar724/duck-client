import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { findActiveUserById } from '@/server/services/user';
import { Booking } from '@/server/models/booking';
import { finalizeManualRefund } from '@/server/services/booking-payment';
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

  if (booking.status !== 'CONFIRMED') {
    return errorResponse(400, `cannot refund booking with status: ${booking.status}`);
  }
  if (booking.supplier_id.toString() !== user.supplier_id.toString()) {
    return errorResponse(403, 'unauthorized: booking does not belong to your supplier account');
  }

  try {
    await finalizeManualRefund(booking, 'refund');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to refund payment';
    return errorResponse(500, message);
  }

  return NextResponse.json({ message: 'Manual payment refunded successfully.', booking });
}
