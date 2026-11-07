import type { CustomerReceipt, ExpenseLine, ExpenseVoucher, InvoiceStatus } from '@/lib/finance/erp-types';
import { logAudit } from './audit';
import { nextYearNumber } from './counters';
import { badRequest, notFound, so, type FinCtx } from './context';
import { RECEIVABLE_ACCOUNT, paymentAccountFor } from './invoices';
import { createJournalEntry } from './journals';
import { genId, lineId, num, round2, toOut, toOutList, today, yearOf, ymd } from './util';

const COLLECTABLE: InvoiceStatus[] = ['approved', 'issued', 'partially_paid'];

export async function getCustomerReceipts(ctx: FinCtx): Promise<CustomerReceipt[]> {
  const rows = await ctx.m.Receipt.find().sort({ createdAt: -1, _id: -1 }).lean().session(ctx.session);
  return toOutList<CustomerReceipt>(rows);
}

/**
 * Records a customer payment: Dr cash/bank / Cr receivable, applied to the
 * linked invoice and the customer's totals, in one transaction. A receipt
 * larger than the invoice's open balance is rejected (the ERP accepted it
 * and clamped the balance at zero, leaving the books and invoice disagreeing).
 */
export async function createCustomerReceipt(ctx: FinCtx, data: Record<string, unknown>): Promise<CustomerReceipt> {
  const amount = round2(num(data.amount));
  if (amount <= 0) throw badRequest('Receipt amount must be greater than zero.');
  const date = data.date ? ymd(data.date) : today();

  const invoice = data.invoiceId ? await ctx.m.Invoice.findById(String(data.invoiceId)).session(ctx.session) : null;
  if (data.invoiceId && !invoice) throw notFound(`Invoice ${String(data.invoiceId)} not found.`);
  if (invoice) {
    if (!COLLECTABLE.includes(invoice.status)) {
      throw badRequest(`Invoice ${invoice.invoiceNumber} is ${invoice.status} and cannot take a payment.`);
    }
    if (amount > invoice.balance + 0.005) {
      throw badRequest(
        `Receipt amount (${amount.toFixed(2)}) exceeds the open balance of ${invoice.invoiceNumber} (${invoice.balance.toFixed(2)}).`,
      );
    }
  }

  const customerId = invoice?.customerId ?? (data.customerId ? String(data.customerId) : '');
  const customer = customerId ? await ctx.m.Customer.findById(customerId).session(ctx.session) : null;
  if (!invoice && !customer) throw badRequest('Choose the customer or invoice this receipt is for.');

  const paymentMethod = typeof data.paymentMethod === 'string' && data.paymentMethod ? data.paymentMethod : 'Cash';
  const receivingCode =
    typeof data.receivingAccountCode === 'string' && data.receivingAccountCode
      ? data.receivingAccountCode
      : await paymentAccountFor(ctx, paymentMethod);

  const receiptNumber = await nextYearNumber(ctx, 'RCP', yearOf(date));
  const id = genId('rcp');
  const customerName = invoice?.customerName ?? customer?.name ?? String(data.customerName ?? '');

  const journal = await createJournalEntry(ctx, {
    journalNumber: `JV-${receiptNumber}`,
    date,
    sourceDocument: 'CustomerReceipt',
    sourceDocumentNumber: receiptNumber,
    sourceId: id,
    description: `Customer Receipt ${receiptNumber} from ${customerName || 'Customer'}`,
    lines: [
      {
        id: lineId('jl-r-dr', 0),
        accountCode: receivingCode,
        debit: amount,
        credit: 0,
        description: `Collection via ${paymentMethod}`,
      },
      {
        id: lineId('jl-r-cr', 1),
        accountCode: RECEIVABLE_ACCOUNT,
        debit: 0,
        credit: amount,
        description: `Credit to receivable: ${invoice ? invoice.invoiceNumber : 'Customer Account'}`,
      },
    ],
    approvedBy: ctx.actor.name,
    status: 'posted',
  });

  if (invoice) {
    invoice.paidAmount = round2(invoice.paidAmount + amount);
    invoice.balance = round2(Math.max(0, invoice.total - invoice.paidAmount));
    invoice.status = invoice.balance <= 0.005 ? 'paid' : 'partially_paid';
    await invoice.save(so(ctx));
  }
  if (customer) {
    customer.totalPaid = round2(customer.totalPaid + amount);
    customer.outstandingBalance = round2(Math.max(0, customer.outstandingBalance - amount));
    await customer.save(so(ctx));
  }

  const [doc] = await ctx.m.Receipt.create(
    [
      {
        _id: id,
        receiptNumber,
        date,
        customerId: customer?._id ?? customerId,
        customerName,
        invoiceId: invoice?._id,
        invoiceNumber: invoice?.invoiceNumber,
        bookingRef: invoice?.bookingRef,
        amount,
        currency: typeof data.currency === 'string' && data.currency ? data.currency : 'EGP',
        paymentMethod,
        receivingAccountCode: receivingCode,
        reference: typeof data.reference === 'string' ? data.reference : undefined,
        notes: typeof data.notes === 'string' ? data.notes : undefined,
        createdBy: ctx.actor.name,
        approvedBy: ctx.actor.name,
        status: 'posted',
        journalEntryId: journal.id,
      },
    ],
    so(ctx),
  );
  await logAudit(
    ctx,
    'CREATE_RECEIPT',
    'CustomerReceipt',
    receiptNumber,
    `Recorded customer receipt of ${amount.toFixed(2)} EGP from ${customerName}`,
  );
  return toOut<CustomerReceipt>(doc);
}

export async function getExpenses(ctx: FinCtx): Promise<ExpenseVoucher[]> {
  const rows = await ctx.m.Expense.find().sort({ createdAt: -1, _id: -1 }).lean().session(ctx.session);
  return toOutList<ExpenseVoucher>(rows);
}

/** Dr each expense account / Cr the paying cash or bank account. */
export async function createExpense(ctx: FinCtx, data: Record<string, unknown>): Promise<ExpenseVoucher> {
  const raw = Array.isArray(data.lines) ? (data.lines as Partial<ExpenseLine>[]) : [];
  const lines: ExpenseLine[] = raw.map((l, idx) => {
    const amount = round2(num(l.amount));
    if (amount < 0) throw badRequest('Expense amounts cannot be negative.');
    return {
      id: l.id ? String(l.id) : lineId('el', idx),
      description: String(l.description ?? ''),
      categoryId: String(l.categoryId ?? ''),
      amount,
      expenseAccountCode: String(l.expenseAccountCode ?? ''),
      costCenter: String(l.costCenter ?? ''),
      activity: l.activity,
      location: l.location,
    };
  });
  const totalAmount = round2(lines.reduce((s, l) => s + l.amount, 0));
  if (totalAmount <= 0) throw badRequest('Expense amount must be greater than zero.');

  const date = data.date ? ymd(data.date) : today();
  const voucherNumber = await nextYearNumber(ctx, 'EXP', yearOf(date));
  const id = genId('exp');
  const paidFromCode =
    typeof data.paidFromAccountCode === 'string' && data.paidFromAccountCode ? data.paidFromAccountCode : '1111';
  const beneficiary = typeof data.beneficiary === 'string' && data.beneficiary ? data.beneficiary : 'Vendor';

  // As in the ERP, an unknown expense account falls back to 5110.
  const codes = lines.map((l) => l.expenseAccountCode).filter(Boolean);
  const known = new Set(
    (await ctx.m.Account.find({ code: { $in: codes } }).select('code').lean().session(ctx.session)).map((a) => a.code),
  );

  const journal = await createJournalEntry(ctx, {
    journalNumber: `JV-${voucherNumber}`,
    date,
    sourceDocument: 'ExpenseVoucher',
    sourceDocumentNumber: voucherNumber,
    sourceId: id,
    description: `Expense Voucher ${voucherNumber} - ${beneficiary}`,
    lines: [
      ...lines
        .filter((l) => l.amount > 0)
        .map((l) => {
          const code = known.has(l.expenseAccountCode) ? l.expenseAccountCode : '5110';
          return {
            id: `jl-e-dr-${l.id}`,
            accountCode: code,
            debit: l.amount,
            credit: 0,
            description: l.description || undefined,
            costCenter: l.costCenter,
          };
        }),
      {
        id: lineId('jl-e-cr', lines.length),
        accountCode: paidFromCode,
        debit: 0,
        credit: totalAmount,
        description: `Disbursement for ${voucherNumber} to ${beneficiary}`,
      },
    ],
    approvedBy: ctx.actor.name,
    status: 'posted',
  });

  const opt = (key: string) => (typeof data[key] === 'string' && data[key] ? String(data[key]) : undefined);
  const [doc] = await ctx.m.Expense.create(
    [
      {
        _id: id,
        voucherNumber,
        date,
        beneficiary,
        paymentMethod: opt('paymentMethod') ?? 'Cash on Hand',
        paidFromAccountCode: paidFromCode,
        lines,
        totalAmount,
        currency: opt('currency') ?? 'EGP',
        relatedActivity: opt('relatedActivity'),
        relatedLocation: opt('relatedLocation'),
        costCenter: opt('costCenter'),
        notes: opt('notes'),
        attachmentName: opt('attachmentName'),
        createdBy: ctx.actor.name,
        approvedBy: ctx.actor.name,
        status: 'posted',
        journalEntryId: journal.id,
      },
    ],
    so(ctx),
  );
  await logAudit(
    ctx,
    'CREATE_EXPENSE',
    'ExpenseVoucher',
    voucherNumber,
    `Issued expense voucher ${voucherNumber} for ${totalAmount.toFixed(2)} EGP to ${beneficiary}`,
  );
  return toOut<ExpenseVoucher>(doc);
}
