import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { Wallet } from '@/server/models/wallet';
import { errorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

/**
 * Owner-or-admin only. The Go API exposed every wallet balance to any
 * authenticated caller who could guess a user ID; admins keep full access
 * (they also have GET /wallet for the full list), everyone else is limited
 * to their own wallet.
 */
export async function GET(request: Request, { params }: { params: Promise<{ user_id: string }> }) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { user_id: userId } = await params;
  if (!isValidObjectId(userId)) return errorResponse(400, 'Invalid User ID');

  // Before the lookup, so a non-owner cannot distinguish an existing wallet
  // from a missing one via 404 vs 200.
  if (session.role !== 2 && session.user_id !== userId) {
    return errorResponse(403, 'Unauthorized');
  }

  const wallet = await Wallet.findOne({ user_id: userId });
  if (!wallet) return errorResponse(404, 'Wallet not found');

  return NextResponse.json(wallet);
}
