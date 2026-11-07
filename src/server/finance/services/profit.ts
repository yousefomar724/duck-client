import type { JournalLine } from '@/lib/finance/erp-types';
import { LEDGER_STATUSES } from './accounts';
import type { FinCtx } from './context';
import { round2 } from './util';

/**
 * Direct operating costs: every account under 5100 (captain wages and
 * commissions, landing fees, fuel, hospitality…) plus 5210 boat and gear
 * maintenance. The accountant-approved definition behind tour profitability
 * and cost-center margins.
 */
export const isDirectCostAccount = (code: string) => code.startsWith('51') || code === '5210';

/** Revenue sits in the 41xx accounts by activity. */
export const isActivityRevenueAccount = (code: string) => code.startsWith('41');

/** Cash and bank accounts a payment can leave from (1111–1115). */
export const isCashOrBankAccount = (code: string) => /^111[1-9]$/.test(code);

export interface LedgerLine extends JournalLine {
  date: string;
  sourceDocument: string;
  journalStatus: string;
}

/** Posted (and reversed) journal lines dated within the range, oldest first. Empty bounds are open. */
export async function ledgerLinesInRange(ctx: FinCtx, startDate?: string, endDate?: string): Promise<LedgerLine[]> {
  const filter: Record<string, unknown> = { status: { $in: [...LEDGER_STATUSES] } };
  if (startDate || endDate) {
    filter.date = { ...(startDate ? { $gte: startDate } : {}), ...(endDate ? { $lte: endDate } : {}) };
  }
  const journals = await ctx.m.JournalEntry.find(filter)
    .select('date sourceDocument status lines')
    .sort({ date: 1, createdAt: 1, _id: 1 })
    .lean<{ date: string; sourceDocument: string; status: string; lines: JournalLine[] }[]>()
    .session(ctx.session);
  const out: LedgerLine[] = [];
  for (const je of journals) {
    for (const line of je.lines) {
      out.push({ ...line, date: je.date, sourceDocument: je.sourceDocument, journalStatus: je.status });
    }
  }
  return out;
}

export const margin = (revenue: number, cost: number) => {
  const m = round2(revenue - cost);
  return { margin: m, marginPct: revenue > 0 ? Math.round((m / revenue) * 1000) / 10 : 0 };
};

export interface CostCenterRow {
  code: string;
  nameEn: string;
  nameAr: string;
  type: string;
  revenue: number;
  directCost: number;
  margin: number;
  marginPct: number;
}

/**
 * Revenue (41xx, credit − debit) and direct cost (debit − credit) per cost
 * center from posted journal lines in the range. Lines with no cost center
 * land in `unallocated`; nothing is spread across centers.
 */
export async function getCostCenterProfitability(ctx: FinCtx, startDate?: string, endDate?: string) {
  const [centers, lines] = await Promise.all([
    ctx.m.CostCenter.find().sort({ createdAt: 1, _id: 1 }).lean().session(ctx.session),
    ledgerLinesInRange(ctx, startDate, endDate),
  ]);
  const totals = new Map<string, { revenue: number; directCost: number }>();
  const unallocated = { revenue: 0, directCost: 0 };
  for (const l of lines) {
    const revenue = isActivityRevenueAccount(l.accountCode) ? l.credit - l.debit : 0;
    const directCost = isDirectCostAccount(l.accountCode) ? l.debit - l.credit : 0;
    if (!revenue && !directCost) continue;
    const bucket = l.costCenter && centers.some((c) => c.code === l.costCenter)
      ? (totals.get(l.costCenter) ?? totals.set(l.costCenter, { revenue: 0, directCost: 0 }).get(l.costCenter)!)
      : unallocated;
    bucket.revenue += revenue;
    bucket.directCost += directCost;
  }
  const rows: CostCenterRow[] = centers.map((c) => {
    const t = totals.get(c.code) ?? { revenue: 0, directCost: 0 };
    const revenue = round2(t.revenue);
    const directCost = round2(t.directCost);
    return {
      code: c.code,
      nameEn: c.nameEn,
      nameAr: c.nameAr,
      type: c.type,
      revenue,
      directCost,
      ...margin(revenue, directCost),
    };
  });
  return {
    startDate: startDate || null,
    endDate: endDate || null,
    centers: rows,
    unallocated: { revenue: round2(unallocated.revenue), directCost: round2(unallocated.directCost) },
  };
}

/**
 * Dashboard figures from journal movements in the range. Net operating profit
 * is revenue accounts minus expense accounts by account type, so tax payable
 * (2150) and every balance-sheet account stay out. Cash, bank and receivable
 * balances are closing balances at the end of the range.
 */
export async function getDashboardSummary(ctx: FinCtx, startDate?: string, endDate?: string) {
  const [accounts, upTo, inRange] = await Promise.all([
    ctx.m.Account.find().sort({ code: 1 }).lean().session(ctx.session),
    ledgerLinesInRange(ctx, undefined, endDate),
    ledgerLinesInRange(ctx, startDate, endDate),
  ]);
  const byCode = new Map(accounts.map((a) => [a.code, a]));
  const net = (lines: LedgerLine[], code: string, normal: 'Debit' | 'Credit') =>
    lines.reduce((s, l) => (l.accountCode === code ? s + (normal === 'Debit' ? l.debit - l.credit : l.credit - l.debit) : s), 0);

  let revenue = 0;
  let expenses = 0;
  const activity = new Map<string, number>();
  let invoiced = 0;
  let collected = 0;
  for (const l of inRange) {
    const acc = byCode.get(l.accountCode);
    if (!acc) continue;
    if (acc.type === 'Revenue') revenue += l.credit - l.debit;
    else if (acc.type === 'Expense') expenses += l.debit - l.credit;
    if (isActivityRevenueAccount(l.accountCode)) activity.set(l.accountCode, (activity.get(l.accountCode) ?? 0) + l.credit - l.debit);
    if (l.sourceDocument === 'Invoice' && (acc.type === 'Revenue' || l.accountCode === '2150')) invoiced += l.credit - l.debit;
    if ((l.sourceDocument === 'Invoice' || l.sourceDocument === 'CustomerReceipt') && isCashOrBankAccount(l.accountCode)) {
      collected += l.debit - l.credit;
    }
  }
  const balance = (code: string) => round2(net(upTo, code, byCode.get(code)?.normalBalance === 'Credit' ? 'Credit' : 'Debit'));

  return {
    startDate: startDate || null,
    endDate: endDate || null,
    totalInvoiced: round2(invoiced),
    totalCollected: round2(collected),
    receivables: balance('1121'),
    revenue: round2(revenue),
    expenses: round2(expenses),
    operatingProfit: round2(revenue - expenses),
    cash: { '1111': balance('1111'), '1112': balance('1112'), '1113': balance('1113'), '1114': balance('1114') },
    revenueByAccount: [...activity.entries()]
      .filter(([, amount]) => Math.abs(amount) > 0.004)
      .map(([code, amount]) => ({
        code,
        nameEn: byCode.get(code)?.nameEn ?? code,
        nameAr: byCode.get(code)?.nameAr ?? code,
        amount: round2(amount),
      })),
  };
}
