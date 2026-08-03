import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { Booking } from '@/server/models/booking';
import { errorResponse } from '@/server/lib/json';

export async function GET(request: Request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  try {
    const bookings = await Booking.find({ user_id: session.user_id })
      .sort({ created_at: -1 })
      .populate('trip_id')
      .populate('supplier_id');
    return NextResponse.json(bookings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to list bookings';
    return errorResponse(500, message);
  }
}
