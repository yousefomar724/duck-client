import { Types } from 'mongoose';
import { startOfSiteDay } from '@/lib/time';
import { Booking } from '@/server/models/booking';
import { getFinanceModels } from '../models';
import type { SyncOutboxDoc } from '../models/sync';
import { logAudit } from '../services/audit';
import { FinanceError, inTransaction, readCtx } from '../services/context';
import { ensureFinanceSeed } from '../services/seed';
import { round2 } from '../services/util';
import { SYNC_ACTOR, duckSupplierId } from './config';
import { loadDuckBooking, syncDuckBooking, type BookingSyncResult, type RawDuckBooking } from './booking-sync';
import { planBooking } from './mapping';
import { outboxKey, writeOutbox } from './outbox';
import { goLiveDate, recordGoLive, recordReconciledAt, readSyncMeta } from './state';
import { loadDuckAswanTrips, loadDuckTrip, mirrorDuckTrip, type RawDuckTrip } from './trip-sync';

const LOCK_MS = 2 * 60_000;
const MAX_BACKOFF_MS = 6 * 60 * 60_000;

function errorMessage(err: unknown): string {
  if (err instanceof FinanceError) return err.message;
  return err instanceof Error ? err.message : String(err);
}

/** Records a failure in the ERP audit log, once per distinct error. */
async function auditFailure(row: Pick<SyncOutboxDoc, 'kind' | 'refId' | 'lastError'>, message: string) {
  if (row.lastError === message) return;
  try {
    await logAudit(
      readCtx(SYNC_ACTOR),
      'DUCK_SYNC_FAILED',
      row.kind === 'trip' ? 'OfficialTrip' : 'Booking',
      row.refId,
      `Duck ${row.kind} ${row.refId} could not be synced (will retry): ${message}`,
    );
  } catch (err) {
    console.error('[finance-sync] could not write the failure to the audit log', err);
  }
}

export async function syncDuckTrip(duckTripId: string): Promise<{ duckId: string; changed: boolean; skipped?: string }> {
  const trip = await loadDuckTrip(duckTripId);
  if (!trip) return { duckId: duckTripId, changed: false, skipped: 'not found' };
  const supplier = duckSupplierId();
  if (!supplier || String(trip.supplier_id) !== supplier) return { duckId: duckTripId, changed: false, skipped: 'not a Duck Aswan trip' };
  const result = await inTransaction(SYNC_ACTOR, (ctx) => mirrorDuckTrip(ctx, trip));
  return { duckId: duckTripId, changed: result.changed };
}

export interface OutboxRunResult {
  processed: number;
  failed: number;
  results: (BookingSyncResult | { duckId: string; changed: boolean; skipped?: string })[];
  errors: { key: string; error: string }[];
}

/** Claims, runs and settles one outbox row. Returns false when another worker holds it. */
async function runRow(key: string, out: OutboxRunResult): Promise<boolean> {
  const { SyncOutbox } = getFinanceModels();
  const now = new Date();
  const row = await SyncOutbox.findOneAndUpdate(
    { _id: key, status: { $ne: 'done' }, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }] },
    { $set: { lockedUntil: new Date(now.getTime() + LOCK_MS) } },
    { new: true },
  ).lean();
  if (!row) return false;
  try {
    const result = row.kind === 'trip' ? await syncDuckTrip(row.refId) : await syncDuckBooking(row.refId);
    out.results.push(result);
    out.processed += 1;
    // Done only if no newer write was queued meanwhile; otherwise it stays pending.
    await SyncOutbox.updateOne(
      { _id: key, seq: row.seq },
      { $set: { status: 'done', attempts: 0, lastError: '', processedAt: new Date(), lockedUntil: null } },
    );
    await SyncOutbox.updateOne({ _id: key, seq: { $ne: row.seq } }, { $set: { lockedUntil: null } });
  } catch (err) {
    const message = errorMessage(err);
    console.error(`[finance-sync] ${key} failed: ${message}`);
    out.failed += 1;
    out.errors.push({ key, error: message });
    await auditFailure(row, message);
    const attempts = (row.attempts ?? 0) + 1;
    const backoff = Math.min(MAX_BACKOFF_MS, 60_000 * 2 ** Math.min(attempts, 12));
    await SyncOutbox.updateOne(
      { _id: key },
      {
        $set: {
          status: 'failed',
          attempts,
          lastError: message,
          nextAttemptAt: new Date(Date.now() + backoff),
          lockedUntil: null,
        },
      },
    );
  }
  return true;
}

/** Inline processing of just-queued rows (after a Duck write). */
export async function processOutboxKeys(keys: string[]): Promise<OutboxRunResult> {
  const out: OutboxRunResult = { processed: 0, failed: 0, results: [], errors: [] };
  if (!duckSupplierId()) return out;
  await ensureFinanceSeed();
  for (const key of keys) await runRow(key, out);
  return out;
}

/** Due rows: pending, plus failed ones whose backoff has passed (the cron retries those). */
export async function processOutbox(limit = 200, { includeBackoff = false } = {}): Promise<OutboxRunResult> {
  const out: OutboxRunResult = { processed: 0, failed: 0, results: [], errors: [] };
  if (!duckSupplierId()) return out;
  await ensureFinanceSeed();
  const { SyncOutbox } = getFinanceModels();
  const due = await SyncOutbox.find(
    includeBackoff ? { status: { $ne: 'done' } } : { status: { $ne: 'done' }, nextAttemptAt: { $lte: new Date() } },
  )
    .sort({ kind: -1, nextAttemptAt: 1 }) // trips first, so bookings find their mirrored trip
    .limit(limit)
    .select('_id')
    .lean();
  for (const row of due) await runRow(row._id, out);
  return out;
}

export interface ReconcileResult {
  trips: number;
  queued: number;
  outbox: OutboxRunResult;
}

/**
 * The cron pass: mirrors every Duck Aswan trip, queues every Duck Aswan
 * booking written since the last pass (an hour of overlap) and every linked
 * booking that disappeared, then runs the outbox, retrying failures whose
 * backoff is over. Catches anything an inline sync or a hook missed.
 */
export async function reconcileDuckSync(now = new Date()): Promise<ReconcileResult> {
  const supplier = duckSupplierId();
  const empty = { processed: 0, failed: 0, results: [], errors: [] };
  if (!supplier) return { trips: 0, queued: 0, outbox: empty };
  await ensureFinanceSeed();
  const m = getFinanceModels();

  const trips = await loadDuckAswanTrips(supplier);
  await writeOutbox('trip', trips.map((t) => String(t._id)), 'reconcile');

  // Since the last pass (an hour of overlap). On a first pass with a go-live
  // date, everything (the go-live floor keeps history out); without one, only
  // the last two days, so a first cron never imports the whole history.
  const meta = await readSyncMeta();
  const since = meta.reconciledAt
    ? new Date(new Date(meta.reconciledAt).getTime() - 60 * 60_000)
    : (await goLiveDate())
      ? null
      : new Date(now.getTime() - 48 * 60 * 60_000);
  const filter: Record<string, unknown> = { supplier_id: new Types.ObjectId(supplier) };
  if (since) filter.updated_at = { $gte: since };
  const written = await Booking.collection.find(filter, { projection: { _id: 1 } }).toArray();

  const linkIds = (await m.DuckLink.find().select('_id').lean()).map((l) => l._id);
  const present = new Set(
    (
      await Booking.collection
        .find({ _id: { $in: linkIds.filter((id) => /^[0-9a-f]{24}$/i.test(id)).map((id) => new Types.ObjectId(id)) }, deletedAt: null }, { projection: { _id: 1 } })
        .toArray()
    ).map((b) => String(b._id)),
  );
  const missing = linkIds.filter((id) => !present.has(id));

  const ids = [...new Set([...written.map((b) => String(b._id)), ...missing])];
  await writeOutbox('booking', ids, 'reconcile');
  const outbox = await processOutbox(1000, { includeBackoff: false });
  await recordReconciledAt(now);
  return { trips: trips.length, queued: ids.length, outbox };
}

export interface BackfillMonth {
  month: string;
  bookings: number;
  revenue: number;
  cashIn: number;
  cashHeld: number;
}

export interface BackfillPage {
  dryRun: boolean;
  from: string;
  scanned: number;
  next: string | null;
  months: BackfillMonth[];
  skipped: { duckId: string; reason: string }[];
  failures: { duckId: string; error: string }[];
  goLive?: string;
}

/**
 * One page of the backfill: Duck Aswan bookings whose activity date is on or
 * after `from`, in id order after `after`. The dry run only maps them; a real
 * run syncs each one (idempotent, so a page can be re-run) and records the
 * go-live date.
 */
export async function backfillPage(opts: { from: string; dryRun: boolean; after?: string | null; limit?: number }): Promise<BackfillPage> {
  const supplier = duckSupplierId();
  if (!supplier) throw new FinanceError(400, 'FINANCE_DUCK_SUPPLIER_ID is not set: the Duck sync is off.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.from)) throw new FinanceError(400, 'from must be YYYY-MM-DD.');
  const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 100), 1), 500);
  const filter: Record<string, unknown> = {
    supplier_id: new Types.ObjectId(supplier),
    booking_date: { $gte: startOfSiteDay(opts.from) },
    deletedAt: null,
  };
  if (opts.after) {
    if (!/^[0-9a-f]{24}$/i.test(opts.after)) throw new FinanceError(400, 'after must be a booking id.');
    filter._id = { $gt: new Types.ObjectId(opts.after) };
  }
  const rows = (await Booking.collection.find(filter).sort({ _id: 1 }).limit(limit).toArray()) as RawDuckBooking[];

  const page: BackfillPage = {
    dryRun: opts.dryRun,
    from: opts.from,
    scanned: rows.length,
    next: rows.length === limit ? String(rows[rows.length - 1]._id) : null,
    months: [],
    skipped: [],
    failures: [],
  };
  const months = new Map<string, BackfillMonth>();
  const tripCache = new Map<string, RawDuckTrip | null>();

  if (!opts.dryRun) {
    await ensureFinanceSeed();
    page.goLive = await recordGoLive(opts.from);
  }

  for (const b of rows) {
    const tripKey = String(b.trip_id);
    if (!tripCache.has(tripKey)) tripCache.set(tripKey, await loadDuckTrip(b.trip_id));
    const plan = planBooking(b, tripCache.get(tripKey) ?? null);
    if (plan.unsupported) {
      page.skipped.push({ duckId: String(b._id), reason: plan.unsupported });
      continue;
    }
    if (!plan.sold) {
      page.skipped.push({ duckId: String(b._id), reason: `not sold (${b.status})` });
      continue;
    }
    if (!opts.dryRun) {
      try {
        const res = await syncDuckBooking(String(b._id));
        if (res.outcome === 'skipped') {
          page.skipped.push({ duckId: res.duckId, reason: res.reason ?? 'skipped' });
          continue;
        }
      } catch (err) {
        page.failures.push({ duckId: String(b._id), error: errorMessage(err) });
        await writeOutbox('booking', [String(b._id)], 'backfill retry');
        continue;
      }
    }
    const month = months.get(plan.month) ?? { month: plan.month, bookings: 0, revenue: 0, cashIn: 0, cashHeld: 0 };
    month.bookings += 1;
    month.revenue = round2(month.revenue + plan.revenue);
    month.cashIn = round2(month.cashIn + plan.cashIn);
    month.cashHeld = round2(month.cashHeld + plan.cashHeld);
    months.set(plan.month, month);
  }
  page.months = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
  return page;
}

/** For tests and the cron: the outbox row of a Duck booking. */
export async function outboxRow(kind: 'booking' | 'trip', refId: string) {
  return getFinanceModels().SyncOutbox.findById(outboxKey(kind, refId)).lean();
}

export { loadDuckBooking };
