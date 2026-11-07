import { after } from 'next/server';
import { getFinanceModels } from '../models';
import type { SyncKind } from '../models/sync';
import { duckSupplierId, inlineSyncEnabled, isDuckSupplier } from './config';

/**
 * The write side of the Duck → ERP outbox. Duck's booking and trip models call
 * `noteBookingWrite` / `noteTripWrite` after every save; the call returns at
 * once and never throws, so a finance problem can neither fail nor slow a
 * Duck write. The row is written after the response (or in the background
 * outside a request), then processed inline if enabled. Anything lost here is
 * picked up by the cron's reconcile pass.
 */

const inFlight = new Set<Promise<unknown>>();

/** Runs `fn` after the current response, or in the background outside a request. */
function runAfterResponse(fn: () => Promise<void>) {
  const guarded = () =>
    fn().catch((err) => {
      console.error('[finance-sync] background sync failed', err);
    });
  try {
    after(guarded);
    return;
  } catch {
    // Not inside a request (scripts, tests, cron internals): run detached.
  }
  const p = guarded();
  inFlight.add(p);
  void p.finally(() => inFlight.delete(p));
}

/** Waits for detached outbox work started outside a request (tests, scripts). */
export async function flushFinanceSync(): Promise<void> {
  while (inFlight.size) await Promise.allSettled([...inFlight]);
}

export const outboxKey = (kind: SyncKind, refId: string) => `${kind}:${refId}`;

/** Upserts the rows as pending. Each enqueue bumps `seq`, so an older run cannot mark them done. */
export async function writeOutbox(kind: SyncKind, refIds: string[], reason: string): Promise<string[]> {
  if (!refIds.length) return [];
  const { SyncOutbox } = getFinanceModels();
  const now = new Date();
  await SyncOutbox.bulkWrite(
    refIds.map((refId) => ({
      updateOne: {
        filter: { _id: outboxKey(kind, refId) },
        update: {
          $set: { kind, refId, status: 'pending', reason, enqueuedAt: now, nextAttemptAt: now },
          $inc: { seq: 1 },
          $setOnInsert: { attempts: 0, lastError: '', lockedUntil: null },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  return refIds.map((refId) => outboxKey(kind, refId));
}

/** Queues Duck ids for sync and, when inline sync is on, processes them after the response. */
export function enqueueFinanceSync(kind: SyncKind, refIds: string[], reason: string): void {
  if (!duckSupplierId() || refIds.length === 0) return;
  runAfterResponse(async () => {
    const keys = await writeOutbox(kind, refIds, reason);
    if (!inlineSyncEnabled()) return;
    const { processOutboxKeys } = await import('./runner');
    await processOutboxKeys(keys);
  });
}

type WithSupplier = { _id: unknown; supplier_id?: unknown };

/** Booking model hook: queue a Duck Aswan booking that was just written. */
export function noteBookingWrite(doc: WithSupplier | null | undefined, reason = 'booking write'): void {
  try {
    if (!doc || !isDuckSupplier(doc.supplier_id)) return;
    enqueueFinanceSync('booking', [String(doc._id)], reason);
  } catch (err) {
    console.error('[finance-sync] could not queue booking', err);
  }
}

/** Trip model hook: queue a Duck Aswan trip for the ERP catalog mirror. */
export function noteTripWrite(doc: WithSupplier | null | undefined): void {
  try {
    if (!doc || !isDuckSupplier(doc.supplier_id)) return;
    enqueueFinanceSync('trip', [String(doc._id)], 'trip write');
  } catch (err) {
    console.error('[finance-sync] could not queue trip', err);
  }
}
