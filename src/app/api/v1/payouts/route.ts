import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { Payout } from '@/server/models/payout';
import { creditWalletBySupplierId } from '@/server/services/wallet';
import { errorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

export async function GET(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const supplierId = searchParams.get('supplier_id');

  if (supplierId && !isValidObjectId(supplierId)) return errorResponse(400, 'Invalid supplier_id');

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (supplierId) filter.supplier_id = supplierId;

  try {
    const payouts = await Payout.find(filter).populate('supplier_id');
    return NextResponse.json(payouts);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to list payouts';
    return errorResponse(500, message);
  }
}

export async function POST(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  let body: { supplier_id?: string; amount?: number; currency?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  try {
    const payout = await Payout.create({
      supplier_id: body.supplier_id,
      amount: body.amount,
      currency: body.currency || 'EGP',
      status: body.status || 'pending',
    });

    if (payout.status === 'paid' || payout.status === 'success' || payout.status === 'confirmed') {
      // Fixes a Go-API bug (#2): credited by supplier_id, not user_id.
      await creditWalletBySupplierId(payout.supplier_id.toString(), -payout.amount).catch(() => {});
    }

    return NextResponse.json(payout, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to create payout';
    return errorResponse(500, message);
  }
}
