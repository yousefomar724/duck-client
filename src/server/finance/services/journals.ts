import type { JournalEntry, JournalLine } from '@/lib/finance/erp-types';
import { logAudit } from './audit';
import { nextYearNumber } from './counters';
import { badRequest, notFound, so, type FinCtx } from './context';
import { assertPostablePeriod, periodIdFor } from './periods';
import { genId, lineId, nowIso, num, round2, toOut, toOutList, today, yearOf, ymd } from './util';

export type JournalSource = JournalEntry['sourceDocument'];

export interface JournalInput {
  /** Set by internal callers (`JV-INV-…`); manual journals get the next `JV-YYYY-NNNN`. */
  journalNumber?: string;
  date: string;
  sourceDocument: JournalSource;
  sourceDocumentNumber?: string;
  sourceId?: string;
  description?: string;
  lines: Partial<JournalLine>[];
  costCenter?: string;
  activity?: string;
  location?: string;
  approvedBy?: string;
  status?: 'draft' | 'posted';
  isReversal?: boolean;
  reversalOfId?: string;
}

const SOURCES: JournalSource[] = [
  'Invoice', 'CustomerReceipt', 'ExpenseVoucher', 'PurchaseInvoice', 'Settlement', 'Depreciation',
  'ManualJournal', 'Reversal', 'AssetPurchase', 'SupplierPayment', 'OpeningBalance', 'AssetDisposal',
];

/**
 * The double-entry engine. Every posting path (invoices, receipts, expenses,
 * assets, opening balances, manual journals) goes through here, inside the
 * caller's transaction: debits must equal credits, every account must exist
 * and accept postings, and the period derived from the journal date must be
 * Open.
 */
export async function createJournalEntry(ctx: FinCtx, entry: JournalInput): Promise<JournalEntry> {
  const date = ymd(entry.date);
  if (!SOURCES.includes(entry.sourceDocument)) throw badRequest('Unknown journal source document.');
  if (!Array.isArray(entry.lines) || entry.lines.length === 0) throw badRequest('Journal entry needs at least one line.');

  const codes = [...new Set(entry.lines.map((l) => String(l.accountCode ?? '')))];
  const accounts = await ctx.m.Account.find({ code: { $in: codes } }).lean().session(ctx.session);
  const byCode = new Map(accounts.map((a) => [a.code, a]));

  const lines: JournalLine[] = entry.lines.map((l, idx) => {
    const code = String(l.accountCode ?? '');
    const acc = byCode.get(code);
    if (!acc) throw badRequest(`Account code ${code || '(empty)'} does not exist.`);
    if (!acc.isPosting) {
      throw badRequest(`Account ${code} (${acc.nameEn}) is a parent/summary account and does not accept direct postings.`);
    }
    const debit = round2(num(l.debit));
    const credit = round2(num(l.credit));
    if (debit < 0 || credit < 0) throw badRequest('Journal line amounts cannot be negative.');
    return {
      id: l.id ? String(l.id) : lineId('jl', idx),
      accountCode: code,
      accountNameAr: l.accountNameAr || acc.nameAr,
      accountNameEn: l.accountNameEn || acc.nameEn,
      debit,
      credit,
      description: l.description,
      costCenter: l.costCenter || undefined,
      activity: l.activity || undefined,
      location: l.location || undefined,
    };
  });

  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw badRequest(
      `Double-entry rule violation: Total debits (${totalDebit.toFixed(2)}) must equal total credits (${totalCredit.toFixed(2)}). Difference: ${(totalDebit - totalCredit).toFixed(2)}`,
    );
  }
  if (totalDebit <= 0) throw badRequest('Journal entry amount must be greater than zero.');

  const status = entry.status === 'draft' ? 'draft' : 'posted';
  const periodId = status === 'posted' ? await assertPostablePeriod(ctx, date) : periodIdFor(date);
  const journalNumber = entry.journalNumber || (await nextYearNumber(ctx, 'JV', yearOf(date)));
  const now = nowIso();

  const [doc] = await ctx.m.JournalEntry.create(
    [
      {
        _id: genId('je'),
        journalNumber,
        date,
        periodId,
        sourceDocument: entry.sourceDocument,
        sourceDocumentNumber: entry.sourceDocumentNumber || journalNumber,
        sourceId: entry.sourceId,
        description: entry.description ?? '',
        lines,
        totalDebit,
        totalCredit,
        costCenter: entry.costCenter,
        activity: entry.activity,
        location: entry.location,
        createdBy: ctx.actor.name,
        approvedBy: entry.approvedBy,
        postedBy: status === 'posted' ? ctx.actor.name : undefined,
        postedAt: status === 'posted' ? now : undefined,
        status,
        isReversal: entry.isReversal,
        reversalOfId: entry.reversalOfId,
      },
    ],
    so(ctx),
  );
  await logAudit(
    ctx,
    'CREATE_JOURNAL',
    'JournalEntry',
    journalNumber,
    `Created journal ${journalNumber} (${totalDebit.toFixed(2)} EGP) - Status: ${status}`,
  );
  return toOut<JournalEntry>(doc);
}

/** Newest first, like the ERP's journal register. */
export async function getJournalEntries(ctx: FinCtx): Promise<JournalEntry[]> {
  const rows = await ctx.m.JournalEntry.find().sort({ createdAt: -1, _id: -1 }).lean().session(ctx.session);
  return toOutList<JournalEntry>(rows);
}

/** `POST /journal-entries`: a manual journal; numbering and period are server-side. */
export async function createManualJournal(ctx: FinCtx, data: Record<string, unknown>): Promise<JournalEntry> {
  const status = data.status === 'draft' ? 'draft' : 'posted';
  const source = SOURCES.includes(data.sourceDocument as JournalSource) ? (data.sourceDocument as JournalSource) : 'ManualJournal';
  return createJournalEntry(ctx, {
    date: typeof data.date === 'string' && data.date ? data.date : today(),
    sourceDocument: source === 'Reversal' ? 'ManualJournal' : source,
    description: typeof data.description === 'string' ? data.description : '',
    lines: Array.isArray(data.lines) ? (data.lines as Partial<JournalLine>[]) : [],
    costCenter: data.costCenter as string | undefined,
    activity: data.activity as string | undefined,
    location: data.location as string | undefined,
    approvedBy: status === 'posted' ? ctx.actor.name : undefined,
    status,
  });
}

/** `date` defaults to today; the Duck sync passes the date of the change it reverses. */
export async function reverseJournalEntry(
  ctx: FinCtx,
  journalId: string,
  reason: string,
  date: string = today(),
): Promise<JournalEntry> {
  const original = await ctx.m.JournalEntry.findById(journalId).session(ctx.session);
  if (!original) throw notFound(`Journal ${journalId} not found.`);
  if (original.status !== 'posted') throw badRequest('Only posted journal entries can be reversed.');

  const reversal = await createJournalEntry(ctx, {
    journalNumber: `REV-${original.journalNumber}`,
    date,
    sourceDocument: 'Reversal',
    sourceDocumentNumber: original.journalNumber,
    sourceId: original._id,
    description: `Reversal of ${original.journalNumber}: ${reason}`,
    lines: original.lines.map((line, idx) => ({
      id: lineId('rev', idx),
      accountCode: line.accountCode,
      accountNameAr: line.accountNameAr,
      accountNameEn: line.accountNameEn,
      debit: line.credit,
      credit: line.debit,
      description: `Reversal of ${original.journalNumber}: ${line.description || ''}`,
      costCenter: line.costCenter,
      activity: line.activity,
      location: line.location,
    })),
    approvedBy: ctx.actor.name,
    status: 'posted',
    isReversal: true,
    reversalOfId: original._id,
  });

  // Conditional on still being posted, so two concurrent reversals cannot both win.
  const flipped = await ctx.m.JournalEntry.updateOne(
    { _id: original._id, status: 'posted' },
    { $set: { status: 'reversed' } },
    so(ctx),
  );
  if (flipped.modifiedCount !== 1) throw badRequest('Only posted journal entries can be reversed.');

  await logAudit(
    ctx,
    'REVERSE_JOURNAL',
    'JournalEntry',
    reversal.journalNumber,
    `Reversed journal ${original.journalNumber}. Reason: ${reason}`,
  );
  return reversal;
}
