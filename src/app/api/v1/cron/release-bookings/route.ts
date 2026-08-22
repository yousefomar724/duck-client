import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { Booking } from '@/server/models/booking';
import { errorResponse } from '@/server/lib/json';

/**
 * Replaces the Go 24h ticker (`StartBookingCron`). Finds active bookings
 * whose trip has ended (booking_date + trip.duration days < now), marks
 * them COMPLETED, freeing the resources they held. Call on a schedule
 * (see vercel.json) with `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization') ?? '';
  if (!secret || header !== `Bearer ${secret}`) {
    return errorResponse(401, 'Unauthorized');
  }

  await dbConnect();

  try {
    const now = new Date();
    const candidates = await Booking.find({ status: { $in: ['CONFIRMED', 'SUCCESS', 'PAID'] } }).populate(
      'trip_id',
    );

    let releasedCount = 0;
    for (const booking of candidates) {
      const trip = booking.trip_id as unknown as { duration?: number } | null;
      const duration = trip?.duration ?? 0;
      const endsAt = new Date(booking.booking_date.getTime() + duration * 24 * 60 * 60 * 1000);
      if (endsAt < now) {
        booking.status = 'COMPLETED';
        await booking.save();
        releasedCount += 1;
      }
    }

    return NextResponse.json({ released_count: releasedCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to release bookings';
    return errorResponse(500, message);
  }
}
