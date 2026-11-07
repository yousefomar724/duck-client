import type { AnyBulkWriteOperation, Model } from 'mongoose';
import { getFinanceModels, type FinanceModels } from '../models';
import { periodSkeleton } from './periods';
import {
  ACCOUNTS,
  ACTIVITY_TYPES,
  ASSET_CATEGORIES,
  CHANNELS,
  COST_CENTERS,
  CUSTOM_ROLES,
  EXPENSE_MAPPINGS,
  LOCATIONS,
  PAYMENT_METHODS,
  SERVICES,
} from './reference-data';
import { nowIso } from './util';

/** Bump when reference data gains rows that existing databases should receive. */
export const SEED_VERSION = 1;
const SEED_ID = 'reference-seed';

type WithId = { id: string };

function insertOnly<T extends object>(filter: Record<string, unknown>, doc: T): AnyBulkWriteOperation {
  return { updateOne: { filter, update: { $setOnInsert: doc }, upsert: true } };
}

function byId<T extends WithId>(rows: T[], ordered = true): AnyBulkWriteOperation[] {
  return rows.map(({ id, ...rest }, idx) =>
    insertOnly({ _id: id }, { ...rest, ...(ordered ? { sortOrder: idx + 1 } : {}) }),
  );
}

async function write(model: Model<never>, ops: AnyBulkWriteOperation[]) {
  if (ops.length) await model.bulkWrite(ops as never, { ordered: false });
}

/**
 * Idempotent seed of reference data only: chart of accounts, payment
 * methods, channels, locations, cost centers, expense mappings, asset
 * categories, activity types, the service list, internal controls, the
 * role templates, and this year's periods. Never demo users, invoices,
 * journals, customers, bookings or trips.
 *
 * Runs once per database (recorded in `fin_meta`): rows a user later
 * deletes are not brought back, which is what made the ERP resurrect its
 * demo bookings and trips on every restart. Upserts only insert, so a re-run
 * after a partial failure never overwrites edits.
 */
export async function seedReferenceData(m: FinanceModels = getFinanceModels(), year = new Date().getUTCFullYear()) {
  const meta = await m.Meta.findById(SEED_ID).lean();
  if (meta && meta.version >= SEED_VERSION) return { applied: false };

  const w = <T>(model: Model<T>) => model as unknown as Model<never>;
  await Promise.all([
    write(w(m.Account), ACCOUNTS.map((a) => insertOnly({ code: a.code }, { _id: `acc-${a.code}`, ...a }))),
    write(w(m.CostCenter), COST_CENTERS.map((c) => insertOnly({ code: c.code }, { _id: `cc-${c.code}`, ...c }))),
    write(w(m.ExpenseMapping), byId(EXPENSE_MAPPINGS)),
    write(w(m.PaymentMethod), byId(PAYMENT_METHODS)),
    write(w(m.Channel), byId(CHANNELS)),
    write(w(m.Location), byId(LOCATIONS)),
    write(w(m.AssetCategory), byId(ASSET_CATEGORIES, false)),
    write(w(m.ActivityType), byId(ACTIVITY_TYPES)),
    write(w(m.Service), byId(SERVICES.map((s) => ({ ...s, active: true })))),
    write(w(m.CustomRole), byId(CUSTOM_ROLES)),
    write(
      w(m.Period),
      Array.from({ length: 12 }, (_, i) => {
        const { _id, ...rest } = periodSkeleton(year, i + 1);
        return insertOnly({ _id }, rest);
      }),
    ),
    write(w(m.InternalControls), [
      insertOnly(
        { _id: 'internal-controls' },
        {
          maxApprovalLimit: 5000,
          requireTwoStepApproval: true,
          enforceSegregationOfDuties: true,
          blockLockedPeriodPostings: true,
          forbidDirectPostedEdits: true,
          autoDepreciationOnClose: true,
          baseCurrency: 'EGP',
        },
      ),
    ]),
  ]);

  await m.Meta.updateOne(
    { _id: SEED_ID },
    { $set: { version: SEED_VERSION, appliedAt: nowIso() } },
    { upsert: true },
  );
  return { applied: true };
}

declare global {
  var _financeSeed: Promise<unknown> | undefined;
}

/** Seeds once per process before the first finance request; retried after a failure. */
export function ensureFinanceSeed(): Promise<unknown> {
  if (!global._financeSeed) {
    global._financeSeed = seedReferenceData().catch((err) => {
      global._financeSeed = undefined;
      throw err;
    });
  }
  return global._financeSeed;
}
