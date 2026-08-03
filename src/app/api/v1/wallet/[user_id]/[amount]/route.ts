import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { creditWalletByUserId } from '@/server/services/wallet';
import { errorResponse, messageResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ user_id: string; amount: string }> },
) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { user_id: userId, amount: amountStr } = await params;
  if (!isValidObjectId(userId)) return errorResponse(400, 'Invalid User ID');

  const amount = Number(amountStr);
  if (!Number.isFinite(amount)) return errorResponse(400, 'Invalid Amount');

  try {
    await creditWalletByUserId(userId, amount);
    return messageResponse('Balance updated successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to update balance';
    return errorResponse(500, message);
  }
}
