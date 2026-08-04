import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { findActiveUserById } from '@/server/services/user';
import { Trip } from '@/server/models/trip';
import { toTripResponse, createTripFromRequest, type CreateTripBody } from '@/server/services/trip';
import { errorResponse, validationErrorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';
import { createTripBodySchema, flattenFieldErrors } from '@/server/validation/trip';

export async function GET(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get('supplier_id');
  const destinationId = searchParams.get('destination_id');
  const lang = searchParams.get('lang');

  if (supplierId && !isValidObjectId(supplierId)) return errorResponse(400, 'Invalid supplier ID');
  if (destinationId && !isValidObjectId(destinationId)) return errorResponse(400, 'Invalid destination ID');

  const filter: Record<string, unknown> = {};
  if (supplierId) filter.supplier_id = supplierId;
  if (destinationId) filter.destination_ids = destinationId;

  try {
    const trips = await Trip.find(filter)
      .sort({ display_order: 1 })
      .populate('supplier_id')
      .populate('tour_guide_id')
      .populate('destination_ids');

    const json = trips.map((t) => t.toJSON() as Record<string, unknown>);
    if (lang) {
      return NextResponse.json(json.map((t) => toTripResponse(t, lang)));
    }
    return NextResponse.json(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to list trips';
    return errorResponse(500, message);
  }
}

export async function POST(request: Request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const user = await findActiveUserById(session.user_id);
  if (!user) return errorResponse(401, 'Invalid user ID');

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  if (!user.supplier_id && user.role !== 2) {
    return errorResponse(403, 'الحساب غير مرتبط بمورد بعد — يرجى إكمال بيانات المورد أولاً');
  }

  const parsed = createTripBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return validationErrorResponse(flattenFieldErrors(parsed.error));
  }
  const body: CreateTripBody = parsed.data;

  const supplierId = user.supplier_id ? user.supplier_id.toString() : (body.supplier_id ?? '');

  try {
    const trip = await createTripFromRequest(supplierId, body);
    const populated = await Trip.findById(trip._id)
      .populate('supplier_id')
      .populate('tour_guide_id')
      .populate('destination_ids');
    return NextResponse.json(populated, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to create trip';
    return errorResponse(500, message);
  }
}
