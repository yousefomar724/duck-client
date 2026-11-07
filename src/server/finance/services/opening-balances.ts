import type { OpeningBalanceBatch, OpeningBalanceLine, SubledgerSummaryReport } from '@/lib/finance/erp-types';
import { getAccounts } from './accounts';
import { logAudit } from './audit';
import { nextYearNumber } from './counters';
import { badRequest, notFound, so, type FinCtx } from './context';
import { createJournalEntry } from './journals';
import { lineId, nowIso, num, round2, toOut, toOutList, ymd } from './util';

type BatchStatus = OpeningBalanceBatch['status'];
const POSTED: BatchStatus[] = ['Posted', 'posted'];

function normalizeLines(raw: unknown): OpeningBalanceLine[] {
  const list = Array.isArray(raw) ? (raw as Partial<OpeningBalanceLine>[]) : [];
  return list.map((l, idx) => ({
    ...l,
    id: l.id ? String(l.id) : lineId('obl', idx),
    accountCode: String(l.accountCode ?? ''),
    accountNameAr: String(l.accountNameAr ?? ''),
    accountNameEn: String(l.accountNameEn ?? ''),
    debit: round2(Math.abs(num(l.debit))),
    credit: round2(Math.abs(num(l.credit))),
  }));
}

function totals(lines: OpeningBalanceLine[]) {
  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));
  const difference = round2(Math.abs(totalDebit - totalCredit));
  return { totalDebit, totalCredit, difference, isBalanced: difference < 0.01 };
}

export async function getOpeningBalances(ctx: FinCtx): Promise<OpeningBalanceBatch[]> {
  const rows = await ctx.m.OpeningBalance.find().sort({ createdAt: 1, _id: 1 }).lean().session(ctx.session);
  return toOutList<OpeningBalanceBatch>(rows);
}

async function findBatch(ctx: FinCtx, id: string) {
  const batch = await ctx.m.OpeningBalance.findOne({ $or: [{ _id: id }, { batchNumber: id }] }).session(ctx.session);
  if (!batch) throw notFound(`Opening balance batch ${id} not found.`);
  return batch;
}

export async function getOpeningBalanceById(ctx: FinCtx, id: string): Promise<OpeningBalanceBatch> {
  return toOut<OpeningBalanceBatch>(await findBatch(ctx, id));
}

export async function createOpeningBalanceBatch(ctx: FinCtx, data: Record<string, unknown>): Promise<OpeningBalanceBatch> {
  const fiscalYear = Math.trunc(num(data.fiscalYear)) || new Date().getFullYear();
  const batchNumber = await nextYearNumber(ctx, 'OB', fiscalYear, 3);
  const lines = normalizeLines(data.lines);
  const now = nowIso();
  const [batch] = await ctx.m.OpeningBalance.create(
    [
      {
        batchNumber,
        fiscalYear,
        systemStartDate: data.systemStartDate ? ymd(data.systemStartDate, 'systemStartDate') : `${fiscalYear}-01-01`,
        openingJournalDate: data.openingJournalDate ? ymd(data.openingJournalDate, 'openingJournalDate') : `${fiscalYear}-01-01`,
        baseCurrency: 'EGP',
        status: 'Draft',
        ...totals(lines),
        lines,
        createdBy: ctx.actor.name,
        notes: typeof data.notes === 'string' ? data.notes : '',
        supportingDocuments: Array.isArray(data.supportingDocuments) ? data.supportingDocuments.map(String) : [],
        changeHistory: [
          {
            timestamp: now,
            userId: ctx.actor.id,
            userName: ctx.actor.name,
            action: 'CREATE',
            details: `Created draft opening balance batch ${batchNumber} for FY ${fiscalYear}`,
          },
        ],
      },
    ],
    so(ctx),
  );
  await logAudit(ctx, 'CREATE_OPENING_BALANCE', 'OpeningBalanceBatch', batch._id, `Created opening balance batch ${batchNumber}`);
  return toOut<OpeningBalanceBatch>(batch);
}

export async function updateOpeningBalanceBatch(ctx: FinCtx, id: string, updates: Record<string, unknown>): Promise<OpeningBalanceBatch> {
  const batch = await findBatch(ctx, id);
  if (POSTED.includes(batch.status)) {
    throw badRequest(
      'Posted opening balance batch cannot be modified directly. Adjustments must be made via a documented adjustment journal entry.',
    );
  }
  if (updates.lines) {
    const lines = normalizeLines(updates.lines);
    batch.set({ lines, ...totals(lines) });
  }
  const status = updates.status as BatchStatus | undefined;
  if (status && status !== batch.status) {
    // Posting writes the journal, so it only happens through POST /:id/post.
    if (POSTED.includes(status)) throw badRequest('Use the post action to post an opening balance batch.');
    if (!['Draft', 'Under Review', 'Approved', 'draft'].includes(status)) throw badRequest(`Unknown status ${status}.`);
    if (status === 'Under Review') {
      batch.reviewedBy = ctx.actor.name;
      batch.reviewedAt = nowIso();
    } else if (status === 'Approved') {
      batch.approvedBy = ctx.actor.name;
      batch.approvedAt = nowIso();
    }
    batch.status = status;
  }
  if (updates.notes !== undefined) batch.notes = String(updates.notes);
  if (updates.systemStartDate) batch.systemStartDate = ymd(updates.systemStartDate, 'systemStartDate');
  if (updates.openingJournalDate) batch.openingJournalDate = ymd(updates.openingJournalDate, 'openingJournalDate');
  if (updates.fiscalYear) batch.fiscalYear = Math.trunc(num(updates.fiscalYear)) || batch.fiscalYear;

  batch.changeHistory.push({
    timestamp: nowIso(),
    userId: ctx.actor.id,
    userName: ctx.actor.name,
    action: 'UPDATE',
    details: `Updated batch details. Current status: ${batch.status}, Lines: ${batch.lines.length}, Balanced: ${batch.isBalanced}`,
  });
  await batch.save(so(ctx));
  await logAudit(ctx, 'UPDATE_OPENING_BALANCE', 'OpeningBalanceBatch', batch._id, `Updated opening balance batch ${batch.batchNumber}`);
  return toOut<OpeningBalanceBatch>(batch);
}

export async function postOpeningBalanceBatch(ctx: FinCtx, id: string): Promise<OpeningBalanceBatch> {
  const batch = await findBatch(ctx, id);
  if (POSTED.includes(batch.status)) throw badRequest(`Opening balance batch ${batch.batchNumber} has already been posted.`);
  if (!batch.isBalanced || Math.abs(batch.totalDebit - batch.totalCredit) >= 0.01) {
    throw badRequest(
      `Double-entry rule violation: Total debits (${batch.totalDebit.toFixed(2)}) must equal total credits (${batch.totalCredit.toFixed(2)}). Difference: ${batch.difference.toFixed(2)} EGP`,
    );
  }
  if (batch.totalDebit <= 0) throw badRequest('Opening balance total must be greater than zero.');

  const existing = await ctx.m.OpeningBalance.findOne({
    fiscalYear: batch.fiscalYear,
    status: { $in: POSTED },
    _id: { $ne: batch._id },
  }).session(ctx.session);
  if (existing) {
    throw badRequest(
      `Opening balance for Fiscal Year ${batch.fiscalYear} is already posted (${existing.batchNumber}). Duplicate posting blocked.`,
    );
  }

  const journal = await createJournalEntry(ctx, {
    journalNumber: batch.journalNumber || `JV-OPEN-${batch.fiscalYear}`,
    date: batch.openingJournalDate || `${batch.fiscalYear}-01-01`,
    sourceDocument: 'OpeningBalance',
    sourceDocumentNumber: batch.batchNumber,
    sourceId: batch._id,
    description: `Fiscal Year ${batch.fiscalYear} Opening Balances Journal - ${batch.notes || 'DUCK ERP Operations'}`,
    lines: batch.lines.map((l, idx) => ({
      id: `jl-open-${batch._id}-${idx}`,
      accountCode: l.accountCode,
      accountNameAr: l.accountNameAr,
      accountNameEn: l.accountNameEn,
      debit: l.debit,
      credit: l.credit,
      description: `Opening Balance FY${batch.fiscalYear}: ${l.accountNameEn}${l.notes ? ` (${l.notes})` : ''}`,
      costCenter: l.costCenter,
      location: l.location,
    })),
    approvedBy: ctx.actor.name,
    status: 'posted',
  });

  const now = nowIso();
  batch.status = 'Posted';
  batch.journalEntryId = journal.id;
  batch.journalNumber = journal.journalNumber;
  batch.postedBy = ctx.actor.name;
  batch.postedAt = now;
  batch.changeHistory.push({
    timestamp: now,
    userId: ctx.actor.id,
    userName: ctx.actor.name,
    action: 'POST',
    details: `Posted opening balance to General Ledger as ${journal.journalNumber}. Total: ${batch.totalDebit.toFixed(2)} EGP`,
  });
  await batch.save(so(ctx));
  await logAudit(
    ctx,
    'POST_OPENING_BALANCE',
    'OpeningBalanceBatch',
    batch._id,
    `Posted opening balance batch ${batch.batchNumber} as journal ${journal.journalNumber}`,
  );
  return toOut<OpeningBalanceBatch>(batch);
}

type ImportRow = Record<string, unknown>;

const pick = (row: ImportRow, ...keys: string[]) => keys.map((k) => row[k]).find((v) => v !== undefined && v !== null && v !== '');

export async function importOpeningBalancesFromRows(ctx: FinCtx, batchId: string, rows: unknown): Promise<OpeningBalanceBatch> {
  const batch = await findBatch(ctx, batchId);
  if (POSTED.includes(batch.status)) throw badRequest('Cannot import into a posted opening balance batch.');
  const list = Array.isArray(rows) ? (rows as ImportRow[]) : [];
  const accounts = await ctx.m.Account.find().lean().session(ctx.session);
  const byCode = new Map(accounts.map((a) => [a.code, a]));

  const imported: OpeningBalanceLine[] = [];
  list.forEach((row, idx) => {
    if (!row || typeof row !== 'object') return;
    const code = String(pick(row, 'Account Code', 'code', 'كود الحساب') ?? '').trim();
    const acc = code ? byCode.get(code) : undefined;
    if (!acc) return;
    const optional = (...keys: string[]) => {
      const v = pick(row, ...keys);
      return v === undefined ? undefined : String(v);
    };
    imported.push({
      id: lineId('obl-imp', idx),
      accountCode: acc.code,
      accountNameAr: acc.nameAr,
      accountNameEn: acc.nameEn,
      debit: round2(Math.abs(num(pick(row, 'Debit', 'debit', 'مدين')))),
      credit: round2(Math.abs(num(pick(row, 'Credit', 'credit', 'دائن')))),
      costCenter: optional('Cost Center', 'costCenter', 'مركز التكلفة'),
      location: optional('Location', 'location', 'الموقع'),
      notes: optional('Notes', 'notes', 'ملاحظات') ?? '',
    });
  });

  batch.set({ lines: imported, ...totals(imported) });
  batch.changeHistory.push({
    timestamp: nowIso(),
    userId: ctx.actor.id,
    userName: ctx.actor.name,
    action: 'IMPORT',
    details: `Imported ${imported.length} rows from Excel/CSV file. Total Dr: ${batch.totalDebit}, Total Cr: ${batch.totalCredit}`,
  });
  await batch.save(so(ctx));
  await logAudit(ctx, 'IMPORT_OPENING_BALANCES', 'OpeningBalanceBatch', batch._id, `Imported ${imported.length} opening balance lines`);
  return toOut<OpeningBalanceBatch>(batch);
}

const BANK_CODES = ['1111', '1112', '1113', '1114', '1115'];
const BANK_LABELS: Record<string, string> = {
  '1111': 'Cash',
  '1112': 'CIB Bank',
  '1113': 'Vodafone Cash',
  '1114': 'InstaPay',
  '1115': 'Card Gateway',
};

export async function getSubledgerSummaries(ctx: FinCtx): Promise<SubledgerSummaryReport> {
  const [customers, invoices, suppliers, purchases, accounts, assets] = await Promise.all([
    ctx.m.Customer.find().sort({ createdAt: 1 }).lean().session(ctx.session),
    ctx.m.Invoice.find({ balance: { $gt: 0 } }).sort({ createdAt: -1 }).lean().session(ctx.session),
    ctx.m.Supplier.find().sort({ createdAt: 1 }).lean().session(ctx.session),
    ctx.m.PurchaseInvoice.find({ balance: { $gt: 0 } }).lean().session(ctx.session),
    getAccounts(ctx),
    ctx.m.FixedAsset.find({ status: 'Active' }).sort({ createdAt: -1 }).lean().session(ctx.session),
  ]);

  const customerRows = customers.map((c) => {
    const open = invoices
      .filter((i) => i.customerId === c._id)
      .map((i) => ({ invoiceNumber: i.invoiceNumber, date: i.date, dueDate: i.dueDate, total: i.total, paid: i.paidAmount, balance: i.balance }));
    return { customerId: c._id, customerName: c.name, balance: c.outstandingBalance, openInvoicesCount: open.length, invoices: open };
  });
  const supplierRows = suppliers.map((s) => {
    const bills = purchases
      .filter((p) => p.supplierId === s._id)
      .map((p) => ({ billNumber: p.invoiceNumber, date: p.date, dueDate: p.dueDate, total: p.total, paid: p.paidAmount, balance: p.balance }));
    return { supplierId: s._id, supplierName: s.name, balance: s.balance, openBillsCount: bills.length, bills };
  });
  const cashAndBanks = accounts
    .filter((a) => BANK_CODES.includes(a.code))
    .map((a) => ({
      accountCode: a.code,
      accountNameEn: a.nameEn,
      accountNameAr: a.nameAr,
      paymentMethod: BANK_LABELS[a.code],
      balance: a.balance,
    }));
  const fixedAssets = assets.map((a) => ({
    assetId: a.assetId,
    nameEn: a.nameEn,
    nameAr: a.nameAr,
    category: a.category,
    quantity: a.quantity,
    acquisitionCost: a.totalAcquisitionCost || a.acquisitionCost,
    accumulatedDepreciation: a.accumulatedDepreciation,
    netBookValue: a.netBookValue,
  }));

  const sum = <T>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);
  return {
    customers: customerRows,
    suppliers: supplierRows,
    cashAndBanks,
    fixedAssets,
    totalCustomerReceivables: sum(customerRows, (c) => c.balance),
    totalSupplierPayables: sum(supplierRows, (s) => s.balance),
    totalCashAndBank: sum(cashAndBanks, (b) => b.balance),
    totalAssetCost: sum(fixedAssets, (a) => a.acquisitionCost),
    totalAssetAccDep: sum(fixedAssets, (a) => a.accumulatedDepreciation),
    totalAssetNetBook: sum(fixedAssets, (a) => a.netBookValue),
  };
}
