import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { Wallet } from '@/server/models/wallet';
import { walletCreditBreakdown } from '@/server/services/discount';
import { errorResponse } from '@/server/lib/json';

export async function GET(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  try {
    const wallets = await Wallet.find();
    const breakdown = await walletCreditBreakdown();
    return NextResponse.json(
      wallets.map((wallet) => ({
        ...wallet.toJSON(),
        ...(breakdown.get(wallet.supplier_id.toString()) ?? {
          customer_payments: 0,
          platform_discount_credits: 0,
        }),
      })),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to list wallets';
    return errorResponse(500, message);
  }
}
