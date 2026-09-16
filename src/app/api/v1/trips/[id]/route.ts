import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { optionalAuth, requireAuth } from '@/server/auth/guard';
import { findActiveUserById } from '@/server/services/user';
import { Trip } from '@/server/models/trip';
import { toTripResponse, applyTripUpdate, type CreateTripBody } from '@/server/services/trip';
import { errorResponse, messageResponse, validationErrorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';
import { updateTripBodySchema, flattenFieldErrors } from '@/server/validation/trip';

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

  if (trip.status === 'inactive') {
    const session = optionalAuth(request);
    const user = session ? await findActiveUserById(session.user_id) : null;
    const populatedSupplier = trip.supplier_id as unknown as {
      _id?: { toString(): string };
      id?: string;
    };
    const tripSupplierId =
      populatedSupplier?._id?.toString() ??
      populatedSupplier?.id ??
      String(trip.supplier_id);
    const canManage =
      session?.role === 2 ||
      Boolean(user?.supplier_id && user.supplier_id.toString() === tripSupplierId);
    if (!canManage) return errorResponse(404, 'Trip not found');
  }

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

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  const parsed = updateTripBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return validationErrorResponse(flattenFieldErrors(parsed.error));
  }
  const body: Partial<CreateTripBody> = parsed.data;

  const trip = await Trip.findById(id);
  if (!trip) return errorResponse(404, 'trip not found');

  const nextIsTour = body.is_tour ?? trip.is_tour;
  const nextMinGuests = nextIsTour ? 1 : (body.min_guests ?? trip.min_guests ?? 1);
  const nextMaxGuests = body.max_guests ?? trip.max_guests;
  if (nextMinGuests > nextMaxGuests) {
    return validationErrorResponse({
      min_guests: 'الحد الأدنى لا يمكن أن يتجاوز الحد الأقصى',
    });
  }

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
