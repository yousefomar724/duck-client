import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { isValidYmd } from '@/lib/time';
import { isValidObjectId } from '@/server/lib/object-id';
import { errorResponse } from '@/server/lib/json';
import { getPublicSlotAvailability } from '@/server/services/ops';
import { ALLOWED_RESOURCE_TYPES } from '@/server/models/supplier-storage';

export async function GET(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const tripId = searchParams.get('trip_id');
  const date = searchParams.get('date');
  const resourceType = searchParams.get('resource_type') ?? undefined;

  if (!tripId || !isValidObjectId(tripId)) return errorResponse(400, 'Invalid trip ID');
  if (!date || !isValidYmd(date)) return errorResponse(400, 'Invalid date');
  if (
    resourceType &&
    !ALLOWED_RESOURCE_TYPES.includes(resourceType as (typeof ALLOWED_RESOURCE_TYPES)[number])
  ) {
    return errorResponse(400, 'Invalid resource type');
  }

  try {
    const data = await getPublicSlotAvailability(tripId, date, resourceType);
    if (!data) return errorResponse(404, 'trip not found');
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to load availability';
    return errorResponse(500, message);
  }
}
