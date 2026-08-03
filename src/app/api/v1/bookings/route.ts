import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { Booking } from '@/server/models/booking';
import { errorResponse } from '@/server/lib/json';

// Kashier gateway payments are out of scope for this deployment (manual /
// InstaPay only) — this endpoint stays as the 403 stub the Go API returns
// when PAYMENT_MODE=manual_only. Use POST /bookings/manual instead.
export async function POST() {
  return errorResponse(403, 'gateway payments are disabled; use the manual booking endpoint');
}

export async function GET(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  try {
    const bookings = await Booking.find()
      .populate('user_id')
      .populate('trip_id')
      .populate('supplier_id');
    return NextResponse.json(bookings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to list bookings';
    return errorResponse(500, message);
  }
}
