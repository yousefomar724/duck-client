import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { Wallet } from '@/server/models/wallet';
import { errorResponse } from '@/server/lib/json';

export async function GET(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  try {
    const wallets = await Wallet.find();
    return NextResponse.json(wallets);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to list wallets';
    return errorResponse(500, message);
  }
}
