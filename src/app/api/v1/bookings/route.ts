import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { Booking } from '@/server/models/booking';
import { errorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';
import { isValidYmd, zonedEndOfDayExclusive, zonedStartOfDay } from '@/lib/time';
import { ALL_BOOKING_STATUSES } from '@/lib/bookings/status';

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

  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get('supplier_id');
  const status = searchParams.get('status');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const pageRaw = searchParams.get('page');
  const q = searchParams.get('q');
  const resourceType = searchParams.get('resource_type');
  const sort = searchParams.get('sort') === 'created_at' ? 'created_at' : 'booking_date';

  if (supplierId && !isValidObjectId(supplierId)) {
    return errorResponse(400, 'Invalid supplier ID');
  }
  if (status && !ALL_BOOKING_STATUSES.includes(status as (typeof ALL_BOOKING_STATUSES)[number])) {
    return errorResponse(400, 'Invalid status');
  }
  if (from && !isValidYmd(from)) return errorResponse(400, 'Invalid from date');
  if (to && !isValidYmd(to)) return errorResponse(400, 'Invalid to date');

  const filter: Record<string, unknown> = {};
  if (supplierId) filter.supplier_id = supplierId;
  if (status) filter.status = status;
  if (resourceType) filter.resource_type = resourceType;
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = zonedStartOfDay(from);
    if (to) range.$lt = zonedEndOfDayExclusive(to);
    filter.booking_date = range;
  }
  if (q?.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { full_name: { $regex: escaped, $options: 'i' } },
      { phone_number: { $regex: escaped, $options: 'i' } },
    ];
  }

  try {
    const query = Booking.find(filter)
      .populate('user_id')
      .populate('trip_id')
      .populate('supplier_id')
      .sort({ [sort]: -1 });

    if (!pageRaw) {
      const bookings = await query;
      return NextResponse.json(bookings);
    }

    const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1);
    const limit = Math.min(200, Math.max(1, Number.parseInt(searchParams.get('limit') ?? '50', 10) || 50));
    const [items, total] = await Promise.all([
      query.skip((page - 1) * limit).limit(limit),
      Booking.countDocuments(filter),
    ]);
    return NextResponse.json({ items, total, page, limit });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to list bookings';
    return errorResponse(500, message);
  }
}
