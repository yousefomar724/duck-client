import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { Payout } from '@/server/models/payout';
import { creditWalletBySupplierId } from '@/server/services/wallet';
import { errorResponse, messageResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid payout ID');

  const payout = await Payout.findById(id).populate('supplier_id');
  if (!payout) return errorResponse(404, 'payout not found');

  return NextResponse.json(payout);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid payout ID');

  let body: { supplier_id?: string; amount?: number; currency?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  const oldPayout = await Payout.findById(id);
  if (!oldPayout) return errorResponse(500, 'payout not found');
  const oldStatus = oldPayout.status;

  try {
    if (body.supplier_id) oldPayout.supplier_id = body.supplier_id as unknown as typeof oldPayout.supplier_id;
    if (body.amount !== undefined) oldPayout.amount = body.amount;
    if (body.currency) oldPayout.currency = body.currency;
    if (body.status) oldPayout.status = body.status;
    await oldPayout.save();

    const transitionsToPaid =
      (oldPayout.status === 'paid' && oldStatus !== 'paid') ||
      (oldPayout.status === 'success' && oldStatus !== 'success') ||
      (oldPayout.status === 'confirmed' && oldStatus !== 'confirmed');

    if (transitionsToPaid) {
      await creditWalletBySupplierId(oldPayout.supplier_id.toString(), -oldPayout.amount).catch(() => {});
    }

    return NextResponse.json(oldPayout);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to update payout';
    return errorResponse(500, message);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid payout ID');

  try {
    await Payout.updateOne({ _id: id }, { deletedAt: new Date() });
    return messageResponse('Payout deleted successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to delete payout';
    return errorResponse(500, message);
  }
}
