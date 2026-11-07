import type { InvoiceLine, JournalLine, ProviderSettlement } from '@/lib/finance/erp-types';
import { logAudit } from './audit';
import { nextYearNumber } from './counters';
import { badRequest, notFound, so, type FinCtx } from './context';
import { createJournalEntry } from './journals';
import { accountTotals } from './accounts';
import { isCashOrBankAccount } from './profit';
import { genId, lineId, num, round2, toOut, toOutList, today, yearOf, ymd } from './util';

/** Captain wages and commissions (debit), provider payables (credit), captain advances (asset). */
export const CAPTAIN_COMMISSION_ACCOUNT = '5110';
export const PROVIDER_PAYABLE_ACCOUNT = '2120';
export const CAPTAIN_ADVANCE_ACCOUNT = '1123';

const NOT_REVENUE = ['draft', 'pending_review', 'cancelled', 'refunded'];

export async function getProviderSettlements(ctx: FinCtx): Promise<ProviderSettlement[]> {
  const rows = await ctx.m.ProviderSettlement.find().sort({ createdAt: -1, _id: -1 }).lean().session(ctx.session);
  return toOutList<ProviderSettlement>(rows);
}

/** Posted invoice lines for a captain in the period (matched on the captain's name or id). */
async function captainLines(ctx: FinCtx, captain: { _id: string; name: string }, start: string, end: string) {
  const invoices = await ctx.m.Invoice.find({ status: { $nin: NOT_REVENUE }, date: { $gte: start, $lte: end } })
    .select('lines')
    .lean<{ lines: InvoiceLine[] }[]>()
    .session(ctx.session);
  const wanted = new Set([captain.name.trim().toLowerCase(), captain._id.toLowerCase()].filter(Boolean));
  const out: InvoiceLine[] = [];
  for (const inv of invoices) {
    for (const l of inv.lines) if (wanted.has(String(l.captain ?? '').trim().toLowerCase())) out.push(l);
  }
  return out;
}

/** Current balance of the captain advances account. */
async function advanceBalance(ctx: FinCtx): Promise<number> {
  const t = (await accountTotals(ctx))[CAPTAIN_ADVANCE_ACCOUNT] ?? { debit: 0, credit: 0 };
  return round2(t.debit - t.credit);
}

/**
 * Computes and saves a draft settlement for a captain and period: trips are
 * the captain's posted invoice lines, gross revenue their net amounts,
 * commission the captain's rate on that, less the advances to deduct (taken
 * from 1123, never more than the commission or the account holds).
 */
export async function createProviderSettlement(ctx: FinCtx, data: Record<string, unknown>): Promise<ProviderSettlement> {
  const captain = data.providerId ? await ctx.m.Captain.findById(String(data.providerId)).lean().session(ctx.session) : null;
  if (!captain) throw badRequest('Choose a captain from Settings → Captains.');
  const periodStart = ymd(data.periodStart, 'periodStart');
  const periodEnd = ymd(data.periodEnd, 'periodEnd');
  if (periodEnd < periodStart) throw badRequest('The period end cannot be before its start.');

  // The same captain's trips cannot be settled twice.
  const overlap = await ctx.m.ProviderSettlement.findOne({
    providerId: captain._id,
    periodStart: { $lte: periodEnd },
    periodEnd: { $gte: periodStart },
  })
    .lean()
    .session(ctx.session);
  if (overlap) {
    throw badRequest(`${overlap.settlementNumber} already covers ${overlap.periodStart} to ${overlap.periodEnd} for this captain.`);
  }

  const lines = await captainLines(ctx, captain, periodStart, periodEnd);
  if (lines.length === 0) throw badRequest('This captain has no posted invoice lines in that period.');
  const grossRevenue = round2(lines.reduce((s, l) => s + (Number(l.netAmount) || 0), 0));
  const commissionRate = num(captain.commissionRate);
  const commissionAmount = round2((grossRevenue * commissionRate) / 100);

  const advancesDeducted = round2(num(data.advancesDeducted));
  if (advancesDeducted < 0) throw badRequest('Advances cannot be negative.');
  if (advancesDeducted > commissionAmount + 0.005) {
    throw badRequest(`Advances (${advancesDeducted.toFixed(2)}) cannot exceed the commission (${commissionAmount.toFixed(2)}).`);
  }
  if (advancesDeducted > (await advanceBalance(ctx)) + 0.005) {
    throw badRequest('Advances cannot exceed the balance of account 1123.');
  }

  const date = today();
  const settlementNumber = await nextYearNumber(ctx, 'SET', yearOf(date));
  const [doc] = await ctx.m.ProviderSettlement.create(
    [
      {
        _id: genId('set'),
        settlementNumber,
        providerId: captain._id,
        providerName: captain.name,
        periodStart,
        periodEnd,
        totalTrips: lines.length,
        grossRevenue,
        commissionRate,
        commissionAmount,
        advancesDeducted,
        netPayable: round2(commissionAmount - advancesDeducted),
        status: 'draft',
        date,
        notes: typeof data.notes === 'string' && data.notes ? data.notes : undefined,
      },
    ],
    so(ctx),
  );
  await logAudit(
    ctx,
    'CREATE_SETTLEMENT',
    'ProviderSettlement',
    settlementNumber,
    `Prepared ${settlementNumber} for ${captain.name}: commission ${commissionAmount.toFixed(2)}, advances ${advancesDeducted.toFixed(2)}`,
  );
  return toOut<ProviderSettlement>(doc);
}

/** Splits `amount` over the captain's revenue by cost center and activity, so 5110 shows in the right margins. */
function splitByRevenue(lines: InvoiceLine[], amount: number) {
  const groups = new Map<string, { costCenter: string; activity: string; net: number }>();
  for (const l of lines) {
    const key = `${l.costCenter ?? ''}|${l.activity ?? ''}`;
    const g = groups.get(key) ?? { costCenter: l.costCenter ?? '', activity: l.activity ?? '', net: 0 };
    g.net += Number(l.netAmount) || 0;
    groups.set(key, g);
  }
  const list = [...groups.values()];
  const total = list.reduce((s, g) => s + g.net, 0);
  let left = amount;
  return list.map((g, i) => {
    const part = i === list.length - 1 ? round2(left) : round2(total > 0 ? (amount * g.net) / total : amount / list.length);
    left = round2(left - part);
    return { costCenter: g.costCenter, activity: g.activity, amount: part };
  });
}

/**
 * Draft → approved. Dr 5110 commission / Cr 1123 advances cleared / Cr 2120
 * net payable. The 5110 debit carries the cost centers of the captain's trips.
 */
export async function approveProviderSettlement(ctx: FinCtx, id: string): Promise<ProviderSettlement> {
  const s = await ctx.m.ProviderSettlement.findById(id).session(ctx.session);
  if (!s) throw notFound(`Settlement ${id} not found.`);
  if (s.status !== 'draft') throw badRequest(`${s.settlementNumber} is ${s.status}; only a draft can be approved.`);
  if (s.commissionAmount <= 0) throw badRequest('There is no commission to post for this settlement.');
  if (s.advancesDeducted > (await advanceBalance(ctx)) + 0.005) {
    throw badRequest('Advances now exceed the balance of account 1123.');
  }

  const captain = await ctx.m.Captain.findById(s.providerId).lean().session(ctx.session);
  const trips = captain ? await captainLines(ctx, captain, s.periodStart, s.periodEnd) : [];
  const parts = trips.length ? splitByRevenue(trips, s.commissionAmount) : [{ costCenter: '', activity: '', amount: s.commissionAmount }];

  const journalLines: Partial<JournalLine>[] = [
    ...parts
      .filter((p) => p.amount > 0)
      .map((p, i) => ({
        id: lineId('jl-set-dr', i),
        accountCode: CAPTAIN_COMMISSION_ACCOUNT,
        debit: p.amount,
        credit: 0,
        description: `Commission ${s.commissionRate}% - ${s.providerName} (${s.periodStart} to ${s.periodEnd})`,
        costCenter: p.costCenter || undefined,
        activity: p.activity || undefined,
      })),
  ];
  if (s.advancesDeducted > 0) {
    journalLines.push({
      id: lineId('jl-set-adv', 0),
      accountCode: CAPTAIN_ADVANCE_ACCOUNT,
      debit: 0,
      credit: s.advancesDeducted,
      description: `Advances cleared - ${s.providerName}`,
    });
  }
  if (s.netPayable > 0) {
    journalLines.push({
      id: lineId('jl-set-cr', 1),
      accountCode: PROVIDER_PAYABLE_ACCOUNT,
      debit: 0,
      credit: s.netPayable,
      description: `Payable to ${s.providerName}`,
    });
  }

  const journal = await createJournalEntry(ctx, {
    journalNumber: `JV-${s.settlementNumber}`,
    date: today(),
    sourceDocument: 'Settlement',
    sourceDocumentNumber: s.settlementNumber,
    sourceId: s._id,
    description: `Settlement ${s.settlementNumber} - ${s.providerName}`,
    lines: journalLines,
    approvedBy: ctx.actor.name,
    status: 'posted',
  });

  // Conditional on still being a draft, so two approvals cannot both post.
  const moved = await ctx.m.ProviderSettlement.updateOne(
    { _id: s._id, status: 'draft' },
    { $set: { status: 'approved', journalEntryId: journal.id } },
    so(ctx),
  );
  if (moved.modifiedCount !== 1) throw badRequest('This settlement was already approved.');
  await logAudit(ctx, 'APPROVE_SETTLEMENT', 'ProviderSettlement', s.settlementNumber, `Approved ${s.settlementNumber}`);
  return toOut<ProviderSettlement>(await ctx.m.ProviderSettlement.findById(s._id).lean().session(ctx.session));
}

/** Approved → paid. Dr 2120 / Cr the chosen cash or bank account. */
export async function payProviderSettlement(ctx: FinCtx, id: string, data: Record<string, unknown>): Promise<ProviderSettlement> {
  const s = await ctx.m.ProviderSettlement.findById(id).session(ctx.session);
  if (!s) throw notFound(`Settlement ${id} not found.`);
  if (s.status !== 'approved') throw badRequest(`${s.settlementNumber} is ${s.status}; only an approved settlement can be paid.`);
  const paidFrom = typeof data.paidFromAccountCode === 'string' && data.paidFromAccountCode ? data.paidFromAccountCode : '1111';
  if (!isCashOrBankAccount(paidFrom)) throw badRequest('Pay from a cash or bank account (1111–1115).');

  if (s.netPayable > 0) {
    await createJournalEntry(ctx, {
      date: data.date ? ymd(data.date) : today(),
      sourceDocument: 'Settlement',
      sourceDocumentNumber: s.settlementNumber,
      sourceId: s._id,
      description: `Payment of ${s.settlementNumber} - ${s.providerName}`,
      lines: [
        { id: lineId('jl-sp-dr', 0), accountCode: PROVIDER_PAYABLE_ACCOUNT, debit: s.netPayable, credit: 0, description: `Settle ${s.settlementNumber}` },
        { id: lineId('jl-sp-cr', 1), accountCode: paidFrom, debit: 0, credit: s.netPayable, description: `Paid to ${s.providerName}` },
      ],
      approvedBy: ctx.actor.name,
      status: 'posted',
    });
  }
  const moved = await ctx.m.ProviderSettlement.updateOne({ _id: s._id, status: 'approved' }, { $set: { status: 'paid' } }, so(ctx));
  if (moved.modifiedCount !== 1) throw badRequest('This settlement was already paid.');
  await logAudit(ctx, 'PAY_SETTLEMENT', 'ProviderSettlement', s.settlementNumber, `Paid ${s.settlementNumber} (${s.netPayable.toFixed(2)} EGP)`);
  return toOut<ProviderSettlement>(await ctx.m.ProviderSettlement.findById(s._id).lean().session(ctx.session));
}
