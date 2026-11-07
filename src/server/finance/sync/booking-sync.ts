import { Types, type HydratedDocument } from 'mongoose';
import { toSiteYmd } from '@/lib/time';
import { discountLedgerLabel, isManualDiscount } from '@/lib/booking/discount';
import { Booking } from '@/server/models/booking';
import type { DuckLinkDoc, DuckLinkInvoice } from '../models/sync';
import { logAudit } from '../services/audit';
import { nextYearNumber } from '../services/counters';
import { FinanceError, inTransaction, so, type FinCtx } from '../services/context';
import { RECEIVABLE_ACCOUNT, createInvoice } from '../services/invoices';
import { createJournalEntry, reverseJournalEntry } from '../services/journals';
import { createCustomerReceipt } from '../services/receipts';
import { round2, yearOf } from '../services/util';
import { KASHIER_ACCOUNT, SYNC_ACTOR, duckSupplierId, isDuckSupplier, manualPaymentAccount } from './config';
import {
  activityDate,
  bookingActivity,
  cashHeld,
  cashInEntries,
  changeDate,
  erpBookingStatus,
  everSold,
  invoiceSpec,
  nationalityCategory,
  revenueTarget,
  subtotalOf,
  tripName,
  type DuckBookingLike,
  type InvoiceSpec,
} from './mapping';
import { goLiveDate } from './state';
import { loadDuckTrip, mirrorDuckTrip, type MirroredTrip, type RawDuckTrip } from './trip-sync';

export type RawDuckBooking = DuckBookingLike & { _id: Types.ObjectId; deletedAt?: Date | null };

export interface BookingSyncResult {
  duckId: string;
  outcome: 'synced' | 'unchanged' | 'skipped';
  reason?: string;
  actions: string[];
}

/** Reads through the raw collection, so soft-deleted bookings are seen (and treated as removed). */
export async function loadDuckBooking(id: string): Promise<RawDuckBooking | null> {
  if (!/^[0-9a-f]{24}$/i.test(id)) return null;
  return (await Booking.collection.findOne({ _id: new Types.ObjectId(id) })) as RawDuckBooking | null;
}

const COLLECTABLE = ['approved', 'issued', 'partially_paid'];
const max = (a: string, b: string) => (a > b ? a : b);

/**
 * Brings the ERP in line with one Duck booking, in one transaction. State
 * based: it compares what the booking should have produced with what the
 * link table says was posted and posts only the difference, so replaying it
 * any number of times posts nothing new.
 */
export async function syncDuckBooking(duckId: string): Promise<BookingSyncResult> {
  if (!duckSupplierId()) return { duckId, outcome: 'skipped', reason: 'sync disabled', actions: [] };
  const raw = await loadDuckBooking(duckId);
  const goLive = await goLiveDate();
  const trip = raw ? await loadDuckTrip(raw.trip_id) : null;
  return inTransaction(SYNC_ACTOR, (ctx) => syncInTransaction(ctx, duckId, raw, trip, goLive));
}

async function syncInTransaction(
  ctx: FinCtx,
  duckId: string,
  raw: RawDuckBooking | null,
  trip: RawDuckTrip | null,
  goLive: string | null,
): Promise<BookingSyncResult> {
  const inScope = Boolean(raw && !raw.deletedAt && isDuckSupplier(raw.supplier_id));

  // Touch the link first: a concurrent sync of the same booking now conflicts
  // here and retries after this one commits, instead of posting twice.
  let link = await ctx.m.DuckLink.findOneAndUpdate({ _id: duckId }, { $inc: { version: 1 } }, { new: true, ...so(ctx) });
  if (!link) {
    if (!raw || !inScope) return { duckId, outcome: 'skipped', reason: raw ? 'not a Duck Aswan booking' : 'not found', actions: [] };
    if (!everSold(raw)) return { duckId, outcome: 'skipped', reason: `not sold (${raw.status})`, actions: [] };
    if (goLive && activityDate(raw) < goLive) return { duckId, outcome: 'skipped', reason: `before go-live ${goLive}`, actions: [] };
    [link] = await ctx.m.DuckLink.create([{ _id: duckId, invoices: [], receipts: [], refunds: [], sold: false, version: 1 }], so(ctx));
  }
  if (raw && inScope && (raw.currency ?? 'EGP') !== 'EGP') {
    throw new FinanceError(400, `Duck booking ${duckId} is in ${raw.currency}; the ERP books EGP only.`);
  }

  const actions: string[] = [];
  const booking = inScope ? raw! : null;
  const now = new Date();
  const eventDate = booking ? changeDate(booking, now) : toSiteYmd(now);

  const mirrored = trip && isDuckSupplier(trip.supplier_id) ? await mirrorDuckTrip(ctx, trip) : null;
  if (booking) await ensureCustomer(ctx, link, booking);
  if (booking) await upsertErpBooking(ctx, link, booking, mirrored, actions);

  // --- Revenue: one active invoice at the target, re-issued on any change.
  const target = booking ? revenueTarget(booking) : 0;
  let active = link.invoices.find((i) => i.state === 'active') ?? null;
  if (booking && !link.sold) {
    // Invoiced when first seen sold. Seen only once already void, it is
    // still invoiced at its sold value and then reversed below, so the
    // books show the sale and its cancellation.
    const firstSpec = invoiceSpec(booking, trip, target > 0 ? target : booking.amount);
    if (firstSpec.total > 0) active = await issueInvoice(ctx, link, booking, mirrored, firstSpec, actions);
    else link.zeroValue = true;
    link.sold = true;
  }
  if (target > 0 && booking) {
    const spec = invoiceSpec(booking, trip, target);
    if (!active || active.signature !== spec.signature) {
      if (active) await reverseInvoice(ctx, active, `Duck booking changed (${booking.status})`, max(active.date, eventDate), 'cancelled', actions);
      active = spec.total > 0 ? await issueInvoice(ctx, link, booking, mirrored, spec, actions) : null;
    }
  } else if (active) {
    const why = booking ? `Duck booking ${booking.status}` : 'Duck booking deleted';
    await reverseInvoice(ctx, active, why, max(active.date, eventDate), booking?.status === 'REFUNDED' ? 'refunded' : 'cancelled', actions);
    active = null;
  }
  if (booking?.status === 'REFUNDED') {
    // Reversed while the refund was pending; now the money went back.
    const last = [...link.invoices].reverse().find((i) => i.state === 'reversed');
    if (last) await ctx.m.Invoice.updateOne({ _id: last.invoiceId, status: 'cancelled' }, { $set: { status: 'refunded' } }, so(ctx));
  }

  // --- Cash: one receipt per payment entry; money Duck holds but did not
  // itemise becomes an adjustment receipt, money it gave back a refund.
  if (booking) {
    const account = booking.payment_method === 'KASHIER' ? KASHIER_ACCOUNT : manualPaymentAccount();
    const method = booking.payment_method === 'KASHIER' ? 'Kashier (Online Card Gateway)' : 'Manual payment';
    await applyCash(ctx, active, netCash(link));
    const posted = new Set(link.receipts.map((r) => r.key));
    for (const entry of cashInEntries(booking)) {
      if (posted.has(entry.key)) continue;
      await postReceipt(ctx, link, booking, active, entry.key, entry.amount, entry.date, account, method, entry.note, actions);
    }
    const held = cashHeld(booking);
    const net = netCash(link);
    if (held > net + 0.005) {
      const key = `adj:${link.receipts.filter((r) => r.key.startsWith('adj:')).length + 1}`;
      const note = booking.payment_method === 'KASHIER' ? `Kashier order ${booking.order_id || '-'}` : 'Paid amount not itemised in Duck';
      await postReceipt(ctx, link, booking, active, key, round2(held - net), eventDate, account, method, note, actions);
    } else if (net > held + 0.005) {
      await postRefund(ctx, link, booking, round2(net - held), eventDate, account, method, actions);
    }
    await applyCash(ctx, active, netCash(link));
  }

  // Again, now that the invoice and money columns are final.
  if (booking) await upsertErpBooking(ctx, link, booking, mirrored, actions);
  if (link.customerId) await recomputeCustomer(ctx, link.customerId);
  const statusChanged = link.lastStatus !== (booking?.status ?? 'DELETED');
  link.lastStatus = booking?.status ?? 'DELETED';
  link.syncedAt = now.toISOString();
  if (!booking && link.erpBookingId) {
    await ctx.m.Booking.updateOne(
      { _id: link.erpBookingId },
      { $set: { status: 'Cancelled', notes: 'Deleted in Duck admin. Receipts are kept for review.' } },
      so(ctx),
    );
  }
  await link.save(so(ctx));

  if (actions.length || statusChanged) {
    const ref = link.erpBookingNumber ?? duckId;
    const head = booking ? `Duck booking ${duckId} (${booking.status})` : `Duck booking ${duckId} was deleted in Duck; receipts left for review`;
    await logAudit(ctx, 'DUCK_SYNC', 'Booking', ref, `${head}: ${actions.length ? actions.join('; ') : 'status updated'}`);
  }
  return { duckId, outcome: actions.length || statusChanged ? 'synced' : 'unchanged', actions };
}

type LinkDocument = HydratedDocument<DuckLinkDoc>;

const netCash = (link: Pick<DuckLinkDoc, 'receipts' | 'refunds'>) =>
  round2(link.receipts.reduce((s, r) => s + r.amount, 0) - link.refunds.reduce((s, r) => s + r.amount, 0));

/** Finds the customer by phone (or creates one) the first time; keeps it after. */
async function ensureCustomer(ctx: FinCtx, link: LinkDocument, b: RawDuckBooking) {
  if (link.customerId && (await ctx.m.Customer.exists({ _id: link.customerId }).session(ctx.session))) return;
  const phone = (b.phone_number ?? '').trim();
  const found = phone ? await ctx.m.Customer.findOne({ phone }).session(ctx.session) : null;
  if (found) {
    link.customerId = found._id;
    return;
  }
  const [created] = await ctx.m.Customer.create(
    [
      {
        name: b.full_name?.trim() || 'Duck guest',
        phone,
        nationality: '',
        customerType: 'Individual',
        notes: 'Created by the Duck booking sync',
        totalBookings: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        outstandingBalance: 0,
        active: true,
      },
    ],
    so(ctx),
  );
  link.customerId = created._id;
}

/** Invoice / receipt / refund running totals of a customer, from the documents themselves. */
async function recomputeCustomer(ctx: FinCtx, customerId: string) {
  const customer = await ctx.m.Customer.findById(customerId).session(ctx.session);
  if (!customer) return;
  const invoices = await ctx.m.Invoice.find({
    customerId,
    status: { $nin: ['draft', 'pending_review', 'cancelled', 'refunded'] },
  })
    .select('total')
    .lean()
    .session(ctx.session);
  const receipts = await ctx.m.Receipt.find({ customerId }).select('amount').lean().session(ctx.session);
  const links = await ctx.m.DuckLink.find({ customerId }).select('refunds').lean().session(ctx.session);
  const invoiced = round2(invoices.reduce((s, i) => s + i.total, 0));
  const refunded = round2(links.reduce((s, l) => s + l.refunds.reduce((t, r) => t + r.amount, 0), 0));
  const paid = round2(receipts.reduce((s, r) => s + r.amount, 0) - refunded);
  customer.totalBookings = invoices.length;
  customer.totalInvoiced = invoiced;
  customer.totalPaid = paid;
  customer.outstandingBalance = round2(Math.max(0, invoiced - paid));
  await customer.save(so(ctx));
}

async function upsertErpBooking(
  ctx: FinCtx,
  link: LinkDocument,
  b: RawDuckBooking,
  trip: MirroredTrip | null,
  actions: string[],
) {
  const date = activityDate(b);
  const local = b.local_guests ?? 0;
  const foreign = b.foreigner_guests ?? 0;
  const snap = b.pricing_snapshot ?? {};
  const paid = cashHeld(b);
  const active = link.invoices.find((i) => i.state === 'active');
  const fields = {
    tripId: trip?.id ?? link.tripId ?? String(b.trip_id),
    tripName: trip?.name ?? 'Duck trip',
    destination: trip?.destination ?? '',
    activityType: trip?.activityType ?? bookingActivity(b, null).label,
    bookingDate: date,
    bookingTime: new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' }).format(new Date(b.booking_date)),
    customerName: b.full_name ?? '',
    customerPhone: b.phone_number ?? '',
    nationalityCategory: nationalityCategory(b),
    egyptianPax: local === 0 && foreign === 0 ? Math.max(1, b.quantity ?? 1) : local,
    foreignerPax: foreign,
    egyptianUnitPrice: snap.price ?? 0,
    foreignerUnitPrice: snap.foreigner_price ?? 0,
    subtotal: round2(subtotalOf(b)),
    discountAmount: round2(Math.max(0, subtotalOf(b) - b.amount)),
    discountReason: discountLedgerLabel(b.discount),
    totalAmount: round2(b.amount),
    depositPaid: paid,
    balanceDue: round2(Math.max(0, b.amount - paid)),
    status: erpBookingStatus(b, Boolean(active)),
    invoiceId: active?.invoiceId,
    invoiceNumber: active?.invoiceNumber,
    notes: `Duck status: ${b.status}${(b.refund_owed ?? 0) > 0 ? ` · refund owed ${b.refund_owed}` : ''}`,
    websiteRef: String(b._id),
    duckSynced: true,
  };
  link.tripId = fields.tripId;
  if (link.erpBookingId) {
    const unset = active ? {} : { $unset: { invoiceId: 1, invoiceNumber: 1 } };
    const { invoiceId, invoiceNumber, ...rest } = fields;
    await ctx.m.Booking.updateOne(
      { _id: link.erpBookingId },
      { $set: active ? { ...rest, invoiceId, invoiceNumber } : rest, ...unset },
      so(ctx),
    );
    return;
  }
  const existing = await ctx.m.Booking.findOne({ websiteRef: fields.websiteRef }).session(ctx.session);
  if (existing) {
    existing.set(fields);
    await existing.save(so(ctx));
    link.erpBookingId = existing._id;
    link.erpBookingNumber = existing.bookingNumber;
    return;
  }
  const bookingNumber = await nextYearNumber(ctx, 'BKG', yearOf(date));
  const [created] = await ctx.m.Booking.create([{ ...fields, bookingNumber }], so(ctx));
  link.erpBookingId = created._id;
  link.erpBookingNumber = bookingNumber;
  actions.push(`booking ${bookingNumber}`);
}

async function issueInvoice(
  ctx: FinCtx,
  link: LinkDocument,
  b: RawDuckBooking,
  trip: MirroredTrip | null,
  spec: InvoiceSpec,
  actions: string[],
): Promise<DuckLinkInvoice> {
  const activity = bookingActivity(b, null);
  const invoice = await createInvoice(ctx, {
    date: spec.date,
    dueDate: spec.date,
    customerId: link.customerId,
    customerName: b.full_name?.trim() || 'Duck guest',
    customerPhone: b.phone_number,
    bookingRef: link.erpBookingNumber,
    status: 'issued',
    paidAmount: 0,
    paymentMethod: b.payment_method === 'KASHIER' ? 'Online Card Gateway' : 'Invoice Payment Pending',
    channel: b.source === 'walk_in' ? 'Walk-in Station Direct' : 'Duck Website',
    location: trip?.destination || 'Aswan',
    activity: trip?.activityType ?? activity.label,
    tripType: trip?.name ?? tripName(null),
    responsibleEmployee: SYNC_ACTOR.name,
    lines: spec.lines.map((l) => ({ ...l, id: undefined })),
    notes: `Duck booking ${String(b._id)}${b.discount?.code ? ` · ${isManualDiscount(b.discount) ? discountLedgerLabel(b.discount) : `discount code ${b.discount.code}`}` : ''}`,
  });
  await ctx.m.Invoice.updateOne({ _id: invoice.id }, { $set: { duckSynced: true } }, so(ctx));
  const entry: DuckLinkInvoice = {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    journalId: invoice.journalEntryId ?? '',
    date: spec.date,
    total: invoice.total,
    signature: spec.signature,
    state: 'active',
  };
  link.invoices.push(entry);
  actions.push(`invoice ${invoice.invoiceNumber} (${invoice.total.toFixed(2)})`);
  return link.invoices[link.invoices.length - 1];
}

/** Reverses the invoice's journal (the ERP's reversal mechanism) and closes the invoice. */
async function reverseInvoice(
  ctx: FinCtx,
  inv: DuckLinkInvoice,
  reason: string,
  date: string,
  status: 'cancelled' | 'refunded',
  actions: string[],
) {
  const journal = inv.journalId ? await ctx.m.JournalEntry.findById(inv.journalId).select('status').lean().session(ctx.session) : null;
  if (journal?.status === 'posted') {
    const reversal = await reverseJournalEntry(ctx, inv.journalId, reason, date);
    inv.reversalJournalId = reversal.id;
    actions.push(`reversed ${inv.invoiceNumber} (${reversal.journalNumber})`);
  } else {
    // Already reversed in the ERP by hand: only the link is closed.
    actions.push(`closed ${inv.invoiceNumber} (journal already reversed)`);
  }
  inv.state = 'reversed';
  await ctx.m.Invoice.updateOne({ _id: inv.invoiceId }, { $set: { status, balance: 0 } }, so(ctx));
}

/** Sets the active invoice's paid / balance / status from the cash Duck holds for the booking. */
async function applyCash(ctx: FinCtx, active: DuckLinkInvoice | null, net: number) {
  if (!active) return;
  const invoice = await ctx.m.Invoice.findById(active.invoiceId).session(ctx.session);
  if (!invoice) return;
  const paid = round2(Math.min(invoice.total, Math.max(0, net)));
  const balance = round2(invoice.total - paid);
  const status = balance <= 0.005 ? 'paid' : paid > 0 ? 'partially_paid' : 'issued';
  if (invoice.paidAmount === paid && invoice.balance === balance && invoice.status === status) return;
  invoice.paidAmount = paid;
  invoice.balance = balance;
  invoice.status = status;
  await invoice.save(so(ctx));
}

async function postReceipt(
  ctx: FinCtx,
  link: LinkDocument,
  b: RawDuckBooking,
  active: DuckLinkInvoice | null,
  key: string,
  amount: number,
  date: string,
  account: string,
  method: string,
  note: string,
  actions: string[],
) {
  const invoice = active ? await ctx.m.Invoice.findById(active.invoiceId).select('status balance').lean().session(ctx.session) : null;
  // Applied to the invoice when it can take it; otherwise a payment on the
  // customer's account (a deposit beyond the invoice, or after a cancel).
  const applies = invoice && COLLECTABLE.includes(invoice.status) && amount <= invoice.balance + 0.005;
  const receipt = await createCustomerReceipt(ctx, {
    amount,
    date,
    invoiceId: applies ? active!.invoiceId : undefined,
    customerId: link.customerId,
    paymentMethod: method,
    receivingAccountCode: account,
    reference: `duck:${String(b._id)}:${key}`,
    notes: [`Duck booking ${String(b._id)}`, note].filter(Boolean).join(' · '),
  });
  link.receipts.push({ key, receiptId: receipt.id, receiptNumber: receipt.receiptNumber, amount, date });
  actions.push(`receipt ${receipt.receiptNumber} (${amount.toFixed(2)} → ${account})`);
}

/**
 * Money Duck gave back. The ERP has no refund document, so it is a posted
 * journal: Dr receivable / Cr the account the money left from.
 */
async function postRefund(
  ctx: FinCtx,
  link: LinkDocument,
  b: RawDuckBooking,
  amount: number,
  date: string,
  account: string,
  method: string,
  actions: string[],
) {
  const number = await nextYearNumber(ctx, 'RFD', yearOf(date));
  const name = b.full_name?.trim() || 'Duck guest';
  const journal = await createJournalEntry(ctx, {
    journalNumber: `JV-${number}`,
    date,
    sourceDocument: 'CustomerReceipt',
    sourceDocumentNumber: number,
    sourceId: link.erpBookingId,
    description: `Refund ${number} to ${name} for Duck booking ${link.erpBookingNumber ?? String(b._id)}`,
    lines: [
      { accountCode: RECEIVABLE_ACCOUNT, debit: amount, credit: 0, description: `Refund owed to ${name} settled` },
      { accountCode: account, debit: 0, credit: amount, description: `Refund paid out (${method})` },
    ],
    approvedBy: SYNC_ACTOR.name,
    status: 'posted',
  });
  link.refunds.push({ key: `rf:${link.refunds.length + 1}`, journalId: journal.id, journalNumber: number, amount, date });
  actions.push(`refund ${number} (${amount.toFixed(2)} ← ${account})`);
}
