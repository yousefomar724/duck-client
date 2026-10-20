import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { errorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';
import {
  deleteDiscountCode,
  DiscountCodeError,
  loadDiscountActor,
  parseDiscountWrite,
  updateDiscountCode,
} from '@/server/services/discount-codes';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid discount code ID');

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  // Partial updates reuse the create schema field types, but every field is optional.
  const parsed = parseDiscountWrite({
    code: 'PLACE',
    type: 'percentage',
    value: 1,
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    ...(typeof raw === 'object' && raw ? raw : {}),
  });
  if (!parsed || typeof raw !== 'object' || !raw) return errorResponse(400, 'Invalid input');

  const patch = raw as Record<string, unknown>;
  const input: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) input[key] = patch[key];

  try {
    const actor = await loadDiscountActor(session);
    const code = await updateDiscountCode(
      actor,
      id,
      input as Partial<import('@/server/services/discount-codes').DiscountWriteInput>,
    );
    return NextResponse.json(code);
  } catch (err) {
    if (err instanceof DiscountCodeError) return errorResponse(err.statusCode, err.message);
    const message = err instanceof Error ? err.message : 'failed to update discount code';
    return errorResponse(500, message);
  }
}

export async function DELETE(
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
    const result = await deleteDiscountCode(actor, id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DiscountCodeError) return errorResponse(err.statusCode, err.message);
    const message = err instanceof Error ? err.message : 'failed to delete discount code';
    return errorResponse(500, message);
  }
}
