import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { Booking } from '@/server/models/booking';
import { errorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

const CANCELLABLE_STATUSES = ['CONFIRMED', 'SUCCESS', 'PAID'];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid booking ID');

  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Optional body — Go ignores bind errors here too.
  }

  const booking = await Booking.findById(id);
  if (!booking) return errorResponse(400, 'booking not found');

  if (!CANCELLABLE_STATUSES.includes(booking.status)) {
    return errorResponse(400, `cannot cancel booking with status: ${booking.status}`);
  }

  booking.status = 'REFUND_PENDING';
  await booking.save();

  let message = 'Booking set to refund pending. Process refund when ready.';
  if (body.reason) message += ' Reason noted.';

  return NextResponse.json({ message, booking });
}
