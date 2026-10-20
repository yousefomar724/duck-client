import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { Booking } from '@/server/models/booking';
import { finalizeManualRefund } from '@/server/services/booking-payment';
import { errorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

/**
 * Go called the Kashier Refund API here. Kashier is out of scope for this
 * deployment (manual/InstaPay only), so this settles the refund manually:
 * a REFUND_PENDING booking is marked REFUNDED and the amount is debited
 * from the supplier's wallet, with no external gateway call. `refund` is
 * always null since there is no gateway response to report.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid booking ID');

  const booking = await Booking.findById(id);
  if (!booking) return errorResponse(500, 'booking not found');

  if (booking.status !== 'REFUND_PENDING') {
    return errorResponse(500, `booking is not pending refund, current status: ${booking.status}`);
  }

  try {
    await finalizeManualRefund(booking, 'admin refund');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to process refund';
    return errorResponse(500, message);
  }

  return NextResponse.json({
    message: 'Refund processed',
    booking_status: booking.status,
    refund: null,
  });
}
