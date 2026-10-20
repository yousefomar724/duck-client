import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { errorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';
import {
  DiscountCodeError,
  listRedemptions,
  loadDiscountActor,
} from '@/server/services/discount-codes';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid discount code ID');

  try {
    const actor = await loadDiscountActor(session);
    const rows = await listRedemptions(actor, id);
    return NextResponse.json(rows);
  } catch (err) {
    if (err instanceof DiscountCodeError) return errorResponse(err.statusCode, err.message);
    const message = err instanceof Error ? err.message : 'failed to list redemptions';
    return errorResponse(500, message);
  }
}
