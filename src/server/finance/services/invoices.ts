import type { Invoice, InvoiceLine, InvoiceStatus, JournalLine } from '@/lib/finance/erp-types';
import { logAudit } from './audit';
import { nextYearNumber } from './counters';
import { badRequest, notFound, so, type FinCtx } from './context';
import { createJournalEntry } from './journals';
import { genId, lineId, nowIso, num, round2, toOut, toOutList, today, yearOf, ymd } from './util';

/** VAT / sales tax payable — invoice tax is credited here so the journal balances. */
export const TAX_PAYABLE_ACCOUNT = '2150';
export const RECEIVABLE_ACCOUNT = '1121';
const CASH_ACCOUNT = '1111';

const UNPOSTED: InvoiceStatus[] = ['draft', 'pending_review'];
const CREATABLE: InvoiceStatus[] = ['draft', 'pending_review', 'approved', 'issued', 'partially_paid', 'paid'];

/**
 * The cash/bank account a payment method settles into: the configured
 * payment method's account when it matches, else the ERP's name heuristic.
 */
export async function paymentAccountFor(ctx: FinCtx, paymentMethod: string): Promise<string> {
  const method = paymentMethod.trim();
  if (method) {
    const configured = await ctx.m.PaymentMethod.findOne({ $or: [{ nameEn: method }, { nameAr: method }] })
      .lean()
      .session(ctx.session);
    if (configured?.accountCode) return configured.accountCode;
  }
  if (method.includes('Bank') || method.includes('CIB')) return '1112';
  if (method.includes('Vodafone')) return '1113';
  if (method.includes('InstaPay')) return '1114';
  return CASH_ACCOUNT;
}

export async function getInvoices(ctx: FinCtx): Promise<Invoice[]> {
  const rows = await ctx.m.Invoice.find().sort({ createdAt: -1, _id: -1 }).lean().session(ctx.session);
  return toOutList<Invoice>(rows);
}

export async function getInvoice(ctx: FinCtx, id: string): Promise<Invoice> {
  const row = await ctx.m.Invoice.findById(id).lean().session(ctx.session);
  if (!row) throw notFound(`Invoice ${id} not found.`);
  return toOut<Invoice>(row);
}

function buildLines(raw: unknown): InvoiceLine[] {
  const list = Array.isArray(raw) ? (raw as Partial<InvoiceLine>[]) : [];
  return list.map((l, idx) => {
    const pax = num(l.pax) || 1;
    const unitPrice = num(l.unitPrice);
    const discount = num(l.discount);
    if (pax < 0 || unitPrice < 0 || discount < 0) throw badRequest('Invoice line amounts cannot be negative.');
    const grossAmount = round2(pax * unitPrice);
    if (discount > grossAmount + 0.005) throw badRequest('A line discount cannot exceed the line amount.');
    return {
      id: l.id ? String(l.id) : lineId('line', idx),
      tourType: String(l.tourType ?? ''),
      service: String(l.service ?? ''),
      pax,
      unitPrice,
      grossAmount,
      discount,
      netAmount: round2(grossAmount - discount),
      captain: String(l.captain ?? ''),
      notes: l.notes,
      revenueAccountCode: l.revenueAccountCode ? String(l.revenueAccountCode) : '4110',
      costCenter: String(l.costCenter ?? ''),
      activity: String(l.activity ?? ''),
      location: String(l.location ?? ''),
    };
  });
}

/**
 * Creates an invoice and, unless it is a draft, its posted journal, the
 * customer's running totals and an audit entry — in the caller's
 * transaction. Duck is the principal: revenue is the full net line value.
 */
export async function createInvoice(ctx: FinCtx, data: Record<string, unknown>): Promise<Invoice> {
  const date = data.date ? ymd(data.date) : today();
  const lines = buildLines(data.lines);
  const subtotal = round2(lines.reduce((s, l) => s + l.grossAmount, 0));
  const discountTotal = round2(lines.reduce((s, l) => s + l.discount, 0));
  const taxAmount = round2(num(data.taxAmount));
  if (taxAmount < 0) throw badRequest('Tax amount cannot be negative.');
  const total = round2(subtotal - discountTotal + taxAmount);
  const paidAmount = round2(num(data.paidAmount));
  if (paidAmount < 0) throw badRequest('Paid amount cannot be negative.');
  if (paidAmount > total + 0.005) {
    throw badRequest(`Paid amount (${paidAmount.toFixed(2)}) exceeds the invoice total (${total.toFixed(2)}).`);
  }
  const balance = round2(total - paidAmount);

  const requested = (data.status as InvoiceStatus) || 'approved';
  if (!CREATABLE.includes(requested)) throw badRequest(`An invoice cannot be created as ${requested}.`);
  const posted = !UNPOSTED.includes(requested);
  if (!posted && paidAmount > 0) throw badRequest('A draft invoice cannot carry a payment.');
  // A posted invoice's status follows its numbers, not the client's guess.
  const status: InvoiceStatus = !posted
    ? requested
    : balance <= 0.005
      ? 'paid'
      : paidAmount > 0
        ? 'partially_paid'
        : requested === 'approved'
          ? 'approved'
          : 'issued';

  const customerName = typeof data.customerName === 'string' ? data.customerName.trim() : '';
  const customerType = data.customerType === 'Company' ? 'Company' : 'Individual';
  let customer = data.customerId
    ? await ctx.m.Customer.findById(String(data.customerId)).session(ctx.session)
    : null;
  if (!customer) {
    if (!customerName) throw badRequest('Choose a customer or enter a customer name.');
    [customer] = await ctx.m.Customer.create(
      [
        {
          name: customerName,
          phone: typeof data.customerPhone === 'string' ? data.customerPhone : '',
          customerType,
          totalBookings: 0,
          totalInvoiced: 0,
          totalPaid: 0,
          outstandingBalance: 0,
          active: true,
        },
      ],
      so(ctx),
    );
  }
  if (posted) {
    customer.totalBookings += 1;
    customer.totalInvoiced = round2(customer.totalInvoiced + total);
    customer.totalPaid = round2(customer.totalPaid + paidAmount);
    customer.outstandingBalance = round2(customer.outstandingBalance + balance);
    await customer.save(so(ctx));
  }

  const invoiceNumber = await nextYearNumber(ctx, 'INV', yearOf(date));
  const id = genId('inv');
  const str = (key: string, fallback: string) => (typeof data[key] === 'string' && data[key] ? String(data[key]) : fallback);
  const invoice = {
    _id: id,
    invoiceNumber,
    bookingRef: typeof data.bookingRef === 'string' && data.bookingRef ? data.bookingRef : undefined,
    date,
    dueDate: data.dueDate ? ymd(data.dueDate, 'dueDate') : date,
    customerId: customer._id,
    customerName: customerName || customer.name,
    customerPhone: typeof data.customerPhone === 'string' ? data.customerPhone : undefined,
    customerType,
    paymentMethod: str('paymentMethod', 'Cash on Hand'),
    channel: str('channel', 'Walk-in Station Direct'),
    location: str('location', 'Elephantine Island Dock'),
    captain: str('captain', ''),
    activity: str('activity', 'Kayak Tours'),
    tripType: str('tripType', 'Early Morning Nile Tour'),
    responsibleEmployee: str('responsibleEmployee', ctx.actor.name),
    responsibleAccountant: ctx.actor.name,
    lines,
    subtotal,
    discountTotal,
    taxAmount,
    total,
    paidAmount,
    balance,
    status,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    journalEntryId: undefined as string | undefined,
    postedAt: undefined as string | undefined,
  };

  if (posted) {
    const journal = await createJournalEntry(ctx, {
      journalNumber: `JV-${invoiceNumber}`,
      date,
      sourceDocument: 'Invoice',
      sourceDocumentNumber: invoiceNumber,
      sourceId: id,
      description: `Nile Tour Invoice ${invoiceNumber} - ${invoice.customerName}`,
      lines: await invoiceJournalLines(ctx, invoice),
      approvedBy: ctx.actor.name,
      status: 'posted',
    });
    invoice.journalEntryId = journal.id;
    invoice.postedAt = nowIso();
  }

  const [doc] = await ctx.m.Invoice.create([invoice], so(ctx));
  await logAudit(
    ctx,
    'CREATE_INVOICE',
    'Invoice',
    invoiceNumber,
    `Created invoice ${invoiceNumber} for ${invoice.customerName} (Total: ${total.toFixed(2)} EGP)`,
  );
  return toOut<Invoice>(doc);
}

/**
 * Dr cash/bank (collected) + Dr receivable (balance) = Cr revenue per line
 * (net of discount) + Cr tax payable. The ERP left the tax credit out, so
 * any invoice with tax failed the double-entry check.
 */
async function invoiceJournalLines(
  ctx: FinCtx,
  invoice: Pick<Invoice, 'paidAmount' | 'balance' | 'paymentMethod' | 'invoiceNumber' | 'customerName' | 'lines' | 'taxAmount'>,
): Promise<Partial<JournalLine>[]> {
  const lines: Partial<JournalLine>[] = [];
  if (invoice.paidAmount > 0) {
    lines.push({
      id: lineId('jl-rcv', 0),
      accountCode: await paymentAccountFor(ctx, invoice.paymentMethod),
      debit: invoice.paidAmount,
      credit: 0,
      description: `Payment collected for ${invoice.invoiceNumber}`,
    });
  }
  if (invoice.balance > 0) {
    lines.push({
      id: lineId('jl-ar', 0),
      accountCode: RECEIVABLE_ACCOUNT,
      debit: invoice.balance,
      credit: 0,
      description: `Receivable from ${invoice.customerName}`,
    });
  }
  for (const l of invoice.lines) {
    if (l.netAmount === 0) continue;
    lines.push({
      id: `jl-rev-${l.id}`,
      accountCode: l.revenueAccountCode || '4110',
      debit: 0,
      credit: l.netAmount,
      description: `${l.tourType} - ${l.service} (Pax: ${l.pax})`,
      costCenter: l.costCenter,
      activity: l.activity,
      location: l.location,
    });
  }
  if (invoice.taxAmount > 0) {
    lines.push({
      id: lineId('jl-tax', 0),
      accountCode: TAX_PAYABLE_ACCOUNT,
      debit: 0,
      credit: invoice.taxAmount,
      description: `Tax on ${invoice.invoiceNumber}`,
    });
  }
  return lines;
}
