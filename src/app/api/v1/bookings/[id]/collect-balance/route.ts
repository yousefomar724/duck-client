import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { findActiveUserById } from '@/server/services/user';
import { Booking } from '@/server/models/booking';
import { creditWalletBySupplierId } from '@/server/services/wallet';
import { errorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

/**
 * Settles some or all of the outstanding balance on a booking that was
 * already confirmed with a partial payment (e.g. cash collected on the
 * meeting day). Only the newly-collected delta is credited to the wallet —
 * the deposit was already credited by manual-confirm.
 */
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
    return errorResponse(400, `cannot collect balance on booking with status: ${booking.status}`);
  }
  if (booking.supplier_id.toString() !== user.supplier_id.toString()) {
    return errorResponse(403, 'unauthorized: booking does not belong to your supplier account');
  }

  const remaining = booking.amount - booking.amount_paid;
  if (remaining <= 0) {
    return errorResponse(400, 'booking is already fully paid');
  }

  let body: { amount?: number; note?: string } = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine — defaults to collecting the full remaining balance
  }

  const collected = body.amount && body.amount > 0 ? body.amount : remaining;
  if (collected <= 0 || collected > remaining) {
    return errorResponse(400, `invalid amount: must be between 0 and ${remaining}`);
  }

  booking.amount_paid += collected;
  booking.payment_entries.push({
    amount: collected,
    recorded_at: new Date(),
    note: body.note ?? '',
  });
  await booking.save();

  try {
    await creditWalletBySupplierId(booking.supplier_id.toString(), collected);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to update wallet';
    return errorResponse(500, message);
  }

  return NextResponse.json({ message: 'Balance collected successfully.', booking });
}
