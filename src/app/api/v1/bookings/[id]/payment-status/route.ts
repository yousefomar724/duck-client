import { NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { dbConnect } from '@/server/db/connect';
import { Booking } from '@/server/models/booking';
import { errorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

const schema = z.object({ phone_number: z.string().min(1) });

function notFound() {
  return errorResponse(404, 'booking not found', { code: 'BOOKING_NOT_FOUND' });
}

/**
 * Public, for guest checkout: the browser that made an InstaPay booking asks
 * whether it is still PENDING, so the "unpaid booking" banner goes away once
 * the supplier confirms it. The booking's phone number must match and only the
 * status comes back, so a booking ID alone reveals nothing.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isValidObjectId(id)) return notFound();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return errorResponse(400, 'Invalid input');

  await dbConnect();
  const booking = await Booking.findById(id).select('status phone_number');
  if (!booking || booking.phone_number !== parsed.data.phone_number) {
    return notFound();
  }
  return NextResponse.json({ status: booking.status });
}
