import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { findActiveUserById } from '@/server/services/user';
import { Trip } from '@/server/models/trip';
import { toTripResponse } from '@/server/services/trip';
import { errorResponse } from '@/server/lib/json';

export async function GET(request: Request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const user = await findActiveUserById(session.user_id);
  if (!user || !user.supplier_id) {
    return errorResponse(403, 'User is not a supplier');
  }

  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang');

  try {
    const trips = await Trip.find({ supplier_id: user.supplier_id })
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
