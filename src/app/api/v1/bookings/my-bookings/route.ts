import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { findActiveUserById } from '@/server/services/user';
import { Booking } from '@/server/models/booking';
import { errorResponse } from '@/server/lib/json';

export async function GET(request: Request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const user = await findActiveUserById(session.user_id);
  if (!user || !user.supplier_id) {
    return errorResponse(403, 'user is not a supplier');
  }

  try {
    const bookings = await Booking.find({ supplier_id: user.supplier_id })
      .populate('user_id')
      .populate('trip_id')
      .populate('supplier_id');
    return NextResponse.json(bookings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to list bookings';
    return errorResponse(500, message);
  }
}
