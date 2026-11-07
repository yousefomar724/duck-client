import type { AccountingPeriod } from '@/lib/finance/erp-types';
import { logAudit } from './audit';
import { MissingRecordError, badRequest, notFound, so, type FinCtx } from './context';
import { nowIso, toOut, toOutList, ymd } from './util';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function periodIdFor(date: string): string {
  return `p-${date.slice(0, 4)}-${date.slice(5, 7)}`;
}

/** A fresh Open period covering the month of `year`/`month`. */
export function periodSkeleton(year: number, month: number) {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    _id: `p-${year}-${mm}`,
    year,
    month,
    name: `${MONTHS[month - 1]} ${year}`,
    startDate: `${year}-${mm}-01`,
    endDate: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
    status: 'Open' as const,
  };
}

/**
 * The period a document dated `date` posts into, derived from the date
 * itself (the ERP always used "the first Open period", so a January invoice
 * entered in November landed in November). A month with no period yet gets
 * an Open one. Locked or Closed periods reject the posting.
 */
export async function assertPostablePeriod(ctx: FinCtx, date: string): Promise<string> {
  ymd(date);
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const skeleton = periodSkeleton(year, month);
  const { _id, ...insert } = skeleton;

  // Writing to the period doc makes a concurrent lock and this posting
  // conflict inside their transactions instead of silently interleaving.
  const open = await ctx.m.Period.findOneAndUpdate(
    { _id, status: 'Open' },
    { $set: { lastPostedAt: nowIso() } },
    { new: true, ...so(ctx) },
  );
  if (open) return _id;

  const current = await ctx.m.Period.findById(_id).session(ctx.session);
  if (!current) {
    const create = async () => {
      await ctx.m.Period.updateOne({ _id }, { $setOnInsert: insert }, { upsert: true }).catch((err) => {
        if ((err as { code?: number }).code !== 11000) throw err;
      });
    };
    // Outside a transaction (scripts, tests) just create it and carry on.
    if (!ctx.session) {
      await create();
      return assertPostablePeriod(ctx, date);
    }
    throw new MissingRecordError(create);
  }
  throw badRequest(`Cannot post into ${current.name}: Period is ${current.status}.`);
}

export async function getPeriods(ctx: FinCtx): Promise<AccountingPeriod[]> {
  const rows = await ctx.m.Period.find().sort({ _id: 1 }).lean().session(ctx.session);
  return toOutList<AccountingPeriod>(rows);
}

export async function lockPeriod(ctx: FinCtx, periodId: string): Promise<AccountingPeriod> {
  const period = await ctx.m.Period.findById(periodId).session(ctx.session);
  if (!period) throw notFound(`Period ${periodId} not found.`);
  period.status = 'Locked';
  period.closedAt = nowIso();
  period.closedBy = ctx.actor.name;
  await period.save(so(ctx));
  await logAudit(ctx, 'LOCK_PERIOD', 'AccountingPeriod', periodId, `Locked accounting period ${period.name}`);
  return toOut<AccountingPeriod>(period);
}

export async function unlockPeriod(ctx: FinCtx, periodId: string): Promise<AccountingPeriod> {
  const period = await ctx.m.Period.findById(periodId).session(ctx.session);
  if (!period) throw notFound(`Period ${periodId} not found.`);
  period.status = 'Open';
  await period.save(so(ctx));
  await logAudit(ctx, 'UNLOCK_PERIOD', 'AccountingPeriod', periodId, `Unlocked accounting period ${period.name}`);
  return toOut<AccountingPeriod>(period);
}
