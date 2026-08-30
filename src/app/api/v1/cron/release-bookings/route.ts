import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { errorResponse } from '@/server/lib/json';
import { releaseEndedBookings } from '@/server/services/availability';

/**
 * Backstop for same-day hourly rentals. Vercel Hobby crons run once daily,
 * so `releaseEndedBookings` is also invoked from ops reads and
 * `checkAvailability`. Completes bookings whose frozen `ends_at` is past.
 * Call with `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization') ?? '';
  if (!secret || header !== `Bearer ${secret}`) {
    return errorResponse(401, 'Unauthorized');
  }

  await dbConnect();

  try {
    const releasedCount = await releaseEndedBookings();
    return NextResponse.json({ released_count: releasedCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to release bookings';
    return errorResponse(500, message);
  }
}
