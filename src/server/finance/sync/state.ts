import { getFinanceModels } from '../models';
import { envGoLive } from './config';

/**
 * Sync settings kept in `fin_meta` under `duck-sync`: the go-live date the
 * backfill imported from, and the reconcile cursor of the cron.
 */
interface SyncMeta {
  goLive?: string;
  reconciledAt?: Date;
}

const META_ID = 'duck-sync';

function metaCollection() {
  // The Meta model's schema only knows the reference-seed marker; the sync
  // keeps its own fields on its own row, through the raw collection.
  return getFinanceModels().Meta.collection as unknown as {
    findOne(filter: { _id: string }): Promise<(SyncMeta & { _id: string }) | null>;
    updateOne(filter: { _id: string }, update: Record<string, unknown>, opts?: { upsert?: boolean }): Promise<unknown>;
  };
}

export async function readSyncMeta(): Promise<SyncMeta> {
  return (await metaCollection().findOne({ _id: META_ID })) ?? {};
}

/** Activity dates before this stay out of the ERP unless the booking is already linked. */
export async function goLiveDate(): Promise<string | null> {
  const meta = await readSyncMeta();
  return meta.goLive ?? envGoLive();
}

/** Keeps the earliest go-live the backfill has imported from. */
export async function recordGoLive(from: string): Promise<string> {
  const current = (await readSyncMeta()).goLive;
  const goLive = current && current < from ? current : from;
  await metaCollection().updateOne({ _id: META_ID }, { $set: { goLive, version: 1, appliedAt: new Date().toISOString() } }, { upsert: true });
  return goLive;
}

export async function recordReconciledAt(at: Date): Promise<void> {
  await metaCollection().updateOne(
    { _id: META_ID },
    { $set: { reconciledAt: at }, $setOnInsert: { version: 1, appliedAt: at.toISOString() } },
    { upsert: true },
  );
}
