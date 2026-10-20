import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { errorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';
import {
  createDiscountCode,
  DiscountCodeError,
  listDiscountCodes,
  loadDiscountActor,
  parseDiscountWrite,
} from '@/server/services/discount-codes';

export async function GET(request: Request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  try {
    const actor = await loadDiscountActor(session);
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplier_id');
    if (supplierId && supplierId !== 'platform' && !isValidObjectId(supplierId)) {
      return errorResponse(400, 'Invalid supplier ID');
    }
    const codes = await listDiscountCodes(actor, {
      supplierId,
      status: searchParams.get('status'),
      creator: searchParams.get('creator'),
    });
    return NextResponse.json(codes);
  } catch (err) {
    if (err instanceof DiscountCodeError) return errorResponse(err.statusCode, err.message);
    const message = err instanceof Error ? err.message : 'failed to list discount codes';
    return errorResponse(500, message);
  }
}

export async function POST(request: Request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }
  const input = parseDiscountWrite(raw);
  if (!input) return errorResponse(400, 'Invalid input');

  try {
    const actor = await loadDiscountActor(session);
    const code = await createDiscountCode(actor, input);
    return NextResponse.json(code, { status: 201 });
  } catch (err) {
    if (err instanceof DiscountCodeError) return errorResponse(err.statusCode, err.message);
    const message = err instanceof Error ? err.message : 'failed to create discount code';
    return errorResponse(500, message);
  }
}
