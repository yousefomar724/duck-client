import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { Trip } from '@/server/models/trip';
import { toTripResponse, applyTripUpdate, type CreateTripBody } from '@/server/services/trip';
import { errorResponse, messageResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang');

  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid ID');

  const trip = await Trip.findById(id)
    .populate('supplier_id')
    .populate('tour_guide_id')
    .populate('destination_ids');
  if (!trip) return errorResponse(404, 'Trip not found');

  const json = trip.toJSON() as Record<string, unknown>;
  if (lang) return NextResponse.json(toTripResponse(json, lang));
  return NextResponse.json(json);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid ID');

  let body: Partial<CreateTripBody>;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  const trip = await Trip.findById(id);
  if (!trip) return errorResponse(500, 'trip not found');

  try {
    applyTripUpdate(trip, body);
    await trip.save();
    return messageResponse('Trip updated successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to update trip';
    return errorResponse(500, message);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid ID');

  try {
    await Trip.updateOne({ _id: id }, { deletedAt: new Date() });
    return messageResponse('Trip deleted successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to delete trip';
    return errorResponse(500, message);
  }
}
