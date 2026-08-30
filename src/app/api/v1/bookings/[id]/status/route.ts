import { NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { findActiveUserById } from '@/server/services/user';
import { Booking } from '@/server/models/booking';
import { applyBookingStatus } from '@/server/services/booking-status';
import { BookingEditError } from '@/server/services/booking-edit';
import { errorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

const schema = z.object({
  status: z.enum(['ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW']),
});

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
  if (!user) return errorResponse(403, 'user not found');
  if (session.role === 1 && !user.supplier_id) {
    return errorResponse(403, 'user is not a supplier');
  }
  if (session.role !== 1 && session.role !== 2) {
    return errorResponse(403, 'unauthorized');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid JSON body');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorResponse(400, 'Invalid status');

  const booking = await Booking.findById(id);
  if (!booking) return errorResponse(404, 'booking not found');

  try {
    const updated = await applyBookingStatus(booking, parsed.data.status, {
      user_id: user.id,
      role: session.role,
      supplier_id: user.supplier_id?.toString() ?? null,
    });
    return NextResponse.json({ message: 'Status updated.', booking: updated });
  } catch (err) {
    if (err instanceof BookingEditError) {
      return errorResponse(err.statusCode, err.message);
    }
    throw err;
  }
}
