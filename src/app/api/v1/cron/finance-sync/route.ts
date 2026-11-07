import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { errorResponse } from '@/server/lib/json';
import { FinanceError } from '@/server/finance/services/context';
import { duckSupplierId } from '@/server/finance/sync/config';
import { backfillPage, reconcileDuckSync } from '@/server/finance/sync/runner';

/**
 * Duck Aswan → finance ERP sync. Call with `Authorization: Bearer <CRON_SECRET>`.
 *
 * - GET (Vercel cron, daily): mirrors Duck Aswan trips, queues bookings written
 *   since the last run and linked bookings that were deleted, then processes
 *   the outbox, retrying failures whose backoff is over.
 * - POST `{ from, dryRun, after?, limit? }`: one page of the backfill, driven by
 *   `scripts/finance-backfill-bookings.mjs`.
 *
 * With FINANCE_DUCK_SUPPLIER_ID unset the sync is off and nothing is written.
 */
export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization') ?? '';
  return Boolean(secret) && header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return errorResponse(401, 'Unauthorized');
  if (!duckSupplierId()) return NextResponse.json({ enabled: false, reason: 'FINANCE_DUCK_SUPPLIER_ID is not set' });
  await dbConnect();
  try {
    const result = await reconcileDuckSync();
    return NextResponse.json({
      enabled: true,
      trips: result.trips,
      queued: result.queued,
      processed: result.outbox.processed,
      failed: result.outbox.failed,
      errors: result.outbox.errors.slice(0, 50),
    });
  } catch (err) {
    console.error('[finance-sync] cron failed', err);
    return errorResponse(500, err instanceof Error ? err.message : 'finance sync failed');
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return errorResponse(401, 'Unauthorized');
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(400, 'Invalid JSON body');
  }
  await dbConnect();
  try {
    const page = await backfillPage({
      from: String(body.from ?? ''),
      dryRun: body.dryRun !== false,
      after: typeof body.after === 'string' ? body.after : null,
      limit: typeof body.limit === 'number' ? body.limit : undefined,
    });
    return NextResponse.json(page);
  } catch (err) {
    if (err instanceof FinanceError) return errorResponse(err.status, err.message);
    console.error('[finance-sync] backfill failed', err);
    return errorResponse(500, err instanceof Error ? err.message : 'backfill failed');
  }
}
