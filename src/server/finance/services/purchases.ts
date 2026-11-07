import type { PurchaseInvoice, PurchaseInvoiceLine } from '@/lib/finance/erp-types';
import { logAudit } from './audit';
import { nextYearNumber } from './counters';
import { badRequest, notFound, so, type FinCtx } from './context';
import { createJournalEntry } from './journals';
import { isCashOrBankAccount } from './profit';
import { genId, lineId, num, round2, toOut, toOutList, today, yearOf, ymd } from './util';

export const PAYABLE_ACCOUNT = '2110';

export async function getPurchaseInvoices(ctx: FinCtx): Promise<PurchaseInvoice[]> {
  const rows = await ctx.m.PurchaseInvoice.find().sort({ createdAt: -1, _id: -1 }).lean().session(ctx.session);
  return toOutList<PurchaseInvoice>(rows);
}

/** Saves a draft vendor bill. The supplier is chosen by id or, if new, created from `supplierName`. */
export async function createPurchaseInvoice(ctx: FinCtx, data: Record<string, unknown>): Promise<PurchaseInvoice> {
  const date = data.date ? ymd(data.date) : today();
  const dueDate = data.dueDate ? ymd(data.dueDate, 'dueDate') : date;
  const raw = Array.isArray(data.lines) ? (data.lines as Partial<PurchaseInvoiceLine>[]) : [];
  if (raw.length === 0) throw badRequest('A purchase invoice needs at least one line.');

  const lines: PurchaseInvoiceLine[] = raw.map((l, idx) => {
    const quantity = num(l.quantity) || 1;
    const unitPrice = num(l.unitPrice);
    if (quantity <= 0 || unitPrice < 0) throw badRequest('Purchase line quantity and price cannot be negative.');
    return {
      id: l.id ? String(l.id) : lineId('pl', idx),
      description: String(l.description ?? ''),
      quantity,
      unitPrice,
      total: round2(quantity * unitPrice),
      expenseOrAssetAccountCode: String(l.expenseOrAssetAccountCode ?? ''),
      costCenter: l.costCenter ? String(l.costCenter) : undefined,
    };
  });
  const total = round2(lines.reduce((s, l) => s + l.total, 0));
  if (total <= 0) throw badRequest('Purchase total must be greater than zero.');

  const codes = [...new Set(lines.map((l) => l.expenseOrAssetAccountCode))];
  const accounts = await ctx.m.Account.find({ code: { $in: codes } }).lean().session(ctx.session);
  for (const code of codes) {
    const acc = accounts.find((a) => a.code === code);
    if (!acc) throw badRequest(`Account ${code || '(empty)'} does not exist.`);
    if (!acc.isPosting || (acc.type !== 'Expense' && acc.type !== 'Asset')) {
      throw badRequest(`Account ${code} (${acc.nameEn}) must be a postable expense or asset account.`);
    }
  }

  let supplier = data.supplierId ? await ctx.m.Supplier.findById(String(data.supplierId)).session(ctx.session) : null;
  if (!supplier) {
    const name = typeof data.supplierName === 'string' ? data.supplierName.trim() : '';
    if (!name) throw badRequest('Choose a supplier or enter a supplier name.');
    supplier = await ctx.m.Supplier.findOne({ name }).session(ctx.session);
    if (!supplier) {
      [supplier] = await ctx.m.Supplier.create([{ name, type: 'Other', phone: '', balance: 0, active: true }], so(ctx));
    }
  }

  const invoiceNumber = await nextYearNumber(ctx, 'PINV', yearOf(date));
  const [doc] = await ctx.m.PurchaseInvoice.create(
    [
      {
        _id: genId('pinv'),
        invoiceNumber,
        supplierId: supplier._id,
        supplierName: supplier.name,
        date,
        dueDate,
        lines,
        total,
        paidAmount: 0,
        balance: total,
        status: 'draft',
        notes: typeof data.notes === 'string' && data.notes ? data.notes : undefined,
      },
    ],
    so(ctx),
  );
  await logAudit(ctx, 'CREATE_PURCHASE', 'PurchaseInvoice', invoiceNumber, `Recorded bill ${invoiceNumber} from ${supplier.name} (${total.toFixed(2)} EGP)`);
  return toOut<PurchaseInvoice>(doc);
}

/**
 * Draft → posted. Dr each line's expense or asset account / Cr 2110 accounts
 * payable, and the supplier's balance goes up by the total.
 */
export async function approvePurchaseInvoice(ctx: FinCtx, id: string): Promise<PurchaseInvoice> {
  const p = await ctx.m.PurchaseInvoice.findById(id).session(ctx.session);
  if (!p) throw notFound(`Purchase invoice ${id} not found.`);
  if (p.status !== 'draft') throw badRequest(`${p.invoiceNumber} is ${p.status}; only a draft can be approved.`);

  const journal = await createJournalEntry(ctx, {
    journalNumber: `JV-${p.invoiceNumber}`,
    date: p.date,
    sourceDocument: 'PurchaseInvoice',
    sourceDocumentNumber: p.invoiceNumber,
    sourceId: p._id,
    description: `Purchase invoice ${p.invoiceNumber} - ${p.supplierName}`,
    lines: [
      ...p.lines
        .filter((l) => l.total > 0)
        .map((l) => ({
          id: `jl-pdr-${l.id}`,
          accountCode: l.expenseOrAssetAccountCode,
          debit: l.total,
          credit: 0,
          description: l.description || undefined,
          costCenter: l.costCenter,
        })),
      { id: lineId('jl-pcr', 0), accountCode: PAYABLE_ACCOUNT, debit: 0, credit: p.total, description: `Payable to ${p.supplierName}` },
    ],
    approvedBy: ctx.actor.name,
    status: 'posted',
  });

  const moved = await ctx.m.PurchaseInvoice.updateOne(
    { _id: p._id, status: 'draft' },
    { $set: { status: 'posted', journalEntryId: journal.id } },
    so(ctx),
  );
  if (moved.modifiedCount !== 1) throw badRequest('This purchase invoice was already approved.');
  await ctx.m.Supplier.updateOne({ _id: p.supplierId }, { $inc: { balance: p.total } }, so(ctx));
  await logAudit(ctx, 'APPROVE_PURCHASE', 'PurchaseInvoice', p.invoiceNumber, `Approved ${p.invoiceNumber} (${p.total.toFixed(2)} EGP)`);
  return toOut<PurchaseInvoice>(await ctx.m.PurchaseInvoice.findById(p._id).lean().session(ctx.session));
}

/** Dr 2110 / Cr cash or bank. Partial payments are allowed, never above the balance. */
export async function payPurchaseInvoice(ctx: FinCtx, id: string, data: Record<string, unknown>): Promise<PurchaseInvoice> {
  const p = await ctx.m.PurchaseInvoice.findById(id).session(ctx.session);
  if (!p) throw notFound(`Purchase invoice ${id} not found.`);
  if (p.status !== 'posted') throw badRequest(`${p.invoiceNumber} is ${p.status}; only an approved, unpaid bill can take a payment.`);
  const amount = round2(num(data.amount));
  if (amount <= 0) throw badRequest('Payment amount must be greater than zero.');
  if (amount > p.balance + 0.005) {
    throw badRequest(`Payment (${amount.toFixed(2)}) exceeds the balance of ${p.invoiceNumber} (${p.balance.toFixed(2)}).`);
  }
  const paidFrom = typeof data.paidFromAccountCode === 'string' && data.paidFromAccountCode ? data.paidFromAccountCode : '1111';
  if (!isCashOrBankAccount(paidFrom)) throw badRequest('Pay from a cash or bank account (1111–1115).');

  await createJournalEntry(ctx, {
    date: data.date ? ymd(data.date) : today(),
    sourceDocument: 'SupplierPayment',
    sourceDocumentNumber: p.invoiceNumber,
    sourceId: p._id,
    description: `Payment of ${p.invoiceNumber} - ${p.supplierName}`,
    lines: [
      { id: lineId('jl-spy-dr', 0), accountCode: PAYABLE_ACCOUNT, debit: amount, credit: 0, description: `Pay ${p.invoiceNumber}` },
      { id: lineId('jl-spy-cr', 1), accountCode: paidFrom, debit: 0, credit: amount, description: `Paid to ${p.supplierName}` },
    ],
    approvedBy: ctx.actor.name,
    status: 'posted',
  });

  const paidAmount = round2(p.paidAmount + amount);
  const balance = round2(p.total - paidAmount);
  // Conditional on the balance we read, so two concurrent payments cannot overpay.
  const moved = await ctx.m.PurchaseInvoice.updateOne(
    { _id: p._id, status: 'posted', paidAmount: p.paidAmount },
    { $set: { paidAmount, balance: Math.max(0, balance), status: balance <= 0.005 ? 'paid' : 'posted' } },
    so(ctx),
  );
  if (moved.modifiedCount !== 1) throw badRequest('This bill changed while paying; try again.');
  await ctx.m.Supplier.updateOne({ _id: p.supplierId }, { $inc: { balance: -amount } }, so(ctx));
  await logAudit(ctx, 'PAY_PURCHASE', 'PurchaseInvoice', p.invoiceNumber, `Paid ${amount.toFixed(2)} EGP on ${p.invoiceNumber}`);
  return toOut<PurchaseInvoice>(await ctx.m.PurchaseInvoice.findById(p._id).lean().session(ctx.session));
}
