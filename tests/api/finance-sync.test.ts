import mongoose from 'mongoose';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as manualConfirm } from '@/app/api/v1/bookings/[id]/manual-confirm/route';
import { POST as collectBalance } from '@/app/api/v1/bookings/[id]/collect-balance/route';
import { POST as supplierCancel } from '@/app/api/v1/bookings/[id]/supplier-cancel/route';
import { POST as manualRefund } from '@/app/api/v1/bookings/[id]/manual-refund/route';
import { POST as refundSent } from '@/app/api/v1/bookings/[id]/refund-sent/route';
import { PATCH as editBooking } from '@/app/api/v1/bookings/[id]/route';
import { POST as setStatus } from '@/app/api/v1/bookings/[id]/status/route';
import { GET as cronSync, POST as cronBackfill } from '@/app/api/v1/cron/finance-sync/route';
import { GET as getAccounts } from '@/app/api/v1/finance/accounts/route';
import { GET as getTrialBalance } from '@/app/api/v1/finance/trial-balance/route';
import { PUT as updateErpTrip, DELETE as deleteErpTrip } from '@/app/api/v1/finance/trips/[id]/route';
import { POST as scheduleErpPrice } from '@/app/api/v1/finance/trips/[id]/schedule-price/route';
import { PUT as updateErpBooking } from '@/app/api/v1/finance/bookings/[id]/route';
import { POST as createErpReceipt } from '@/app/api/v1/finance/customer-receipts/route';
import { Booking, type BookingDoc } from '@/server/models/booking';
import { finalizeManualRefund } from '@/server/services/booking-payment';
import { syncDuckBooking } from '@/server/finance/sync/booking-sync';
import { flushFinanceSync } from '@/server/finance/sync/outbox';
import { processOutbox } from '@/server/finance/sync/runner';
import { readSyncMeta } from '@/server/finance/sync/state';
import {
  authHeader,
  createBooking,
  createSupplierStorage,
  createSupplierUser,
  createTrip,
  futureBookingDate,
} from '../utils/factories';
import { jsonRequest } from '../utils/http';
import { createFinanceUser, ctxParams, fin, finRequest, seedFinance } from '../utils/finance';

type User = { id: string; role: number };
type Handler = (r: Request, c: { params: Promise<{ id: string }> }) => Promise<Response>;

async function duckCall(handler: Handler, booking: { id: string }, path: string, user: User, body?: unknown, method = 'POST') {
  const res = await handler(
    jsonRequest(`http://localhost/api/v1/bookings/${booking.id}${path}`, { method, headers: authHeader(user.id, user.role), body }),
    { params: Promise.resolve({ id: booking.id }) },
  );
  expect(res.status, JSON.stringify(await res.clone().json())).toBe(200);
  return res;
}

/** Waits for the hooks' outbox writes, then processes the outbox like the inline sync / cron would. */
async function drain() {
  await flushFinanceSync();
  const out = await processOutbox();
  expect(out.errors).toEqual([]);
  return out;
}

const cron = (method: 'GET' | 'POST', body?: unknown, secret = process.env.CRON_SECRET) =>
  (method === 'GET' ? cronSync : cronBackfill)(
    jsonRequest('http://localhost/api/v1/cron/finance-sync', {
      method,
      body,
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    }),
  );

async function erpState(duckId: string) {
  const link = await fin().DuckLink.findById(duckId).lean();
  const invoices = link ? await fin().Invoice.find({ _id: { $in: link.invoices.map((i) => i.invoiceId) } }).lean() : [];
  const receipts = link ? await fin().Receipt.find({ _id: { $in: link.receipts.map((r) => r.receiptId) } }).lean() : [];
  const erpBooking = await fin().Booking.findOne({ websiteRef: duckId }).lean();
  const active = link?.invoices.find((i) => i.state === 'active');
  const activeInvoice = active ? invoices.find((i) => i._id === active.invoiceId) : undefined;
  return { link, invoices, receipts, erpBooking, activeInvoice };
}

async function counts() {
  const m = fin();
  const [invoices, receipts, journals, bookings, customers] = await Promise.all([
    m.Invoice.countDocuments(),
    m.Receipt.countDocuments(),
    m.JournalEntry.countDocuments(),
    m.Booking.countDocuments(),
    m.Customer.countDocuments(),
  ]);
  return { invoices, receipts, journals, bookings, customers };
}

describe('Duck Aswan → finance ERP booking sync', () => {
  let token: string;
  let supplier: Awaited<ReturnType<typeof createSupplierUser>>['supplier'];
  let supplierUser: User;
  let trip: Awaited<ReturnType<typeof createTrip>>;

  async function balances(): Promise<Record<string, number>> {
    const res = await getAccounts(finRequest('/accounts', { token }));
    const accounts: { code: string; balance: number }[] = await res.json();
    return Object.fromEntries(accounts.map((a) => [a.code, a.balance]));
  }

  async function expectBalancedBooks() {
    const tb = await (await getTrialBalance(finRequest('/trial-balance', { token }))).json();
    expect(tb.isBalanced).toBe(true);
    const journals = await fin().JournalEntry.find().lean();
    for (const j of journals) expect(j.totalDebit).toBeCloseTo(j.totalCredit, 2);
  }

  function duckBooking(overrides: Record<string, unknown> = {}): Promise<BookingDoc & { id: string }> {
    return createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'PENDING',
      amount: 360,
      subtotal: 360,
      quantity: 2,
      local_guests: 2,
      foreigner_guests: 0,
      resource_type: 'kayak',
      pricing_snapshot: { price: 180, foreigner_price: 500, guide_price: 0 },
      booking_date: futureBookingDate(),
      ...overrides,
    }) as Promise<BookingDoc & { id: string }>;
  }

  beforeEach(async () => {
    process.env.FINANCE_SYNC_INLINE = '0';
    await seedFinance();
    ({ token } = await createFinanceUser('Super Admin'));
    const s = await createSupplierUser();
    supplier = s.supplier;
    supplierUser = { id: s.user.id, role: s.user.role };
    process.env.FINANCE_DUCK_SUPPLIER_ID = supplier.id;
    trip = await createTrip(supplier._id, { price: 180, foreigner_price: 500, activities: ['kayak'], guide_price: 200 });
    await createSupplierStorage(supplier._id, { kayak: 20 });
  });

  afterEach(async () => {
    await flushFinanceSync();
    delete process.env.FINANCE_DUCK_SUPPLIER_ID;
    delete process.env.FINANCE_DUCK_MANUAL_ACCOUNT;
    delete process.env.FINANCE_SYNC_INLINE;
  });

  it('ignores pending and failed bookings, and invoices a booking once it is sold', async () => {
    const pending = await duckBooking();
    await duckBooking({ status: 'FAILED' });
    await drain();
    expect(await counts()).toMatchObject({ invoices: 0, receipts: 0, journals: 0, bookings: 0 });
    expect(await fin().DuckLink.countDocuments()).toBe(0);

    await duckCall(manualConfirm, pending, '/manual-confirm', supplierUser, { amount_paid: 360 });
    await drain();

    const { link, activeInvoice, receipts, erpBooking } = await erpState(pending.id);
    expect(link?.sold).toBe(true);
    expect(activeInvoice).toMatchObject({ total: 360, subtotal: 360, taxAmount: 0, paidAmount: 360, status: 'paid', duckSynced: true });
    expect(activeInvoice!.lines).toHaveLength(1);
    expect(activeInvoice!.lines[0]).toMatchObject({ pax: 2, unitPrice: 180, revenueAccountCode: '4110' });
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({ amount: 360, receivingAccountCode: '1111', invoiceId: activeInvoice!._id });
    expect(erpBooking).toMatchObject({ status: 'Invoiced', duckSynced: true, totalAmount: 360, depositPaid: 360, balanceDue: 0 });
    expect(erpBooking!.tripId).toBe((await fin().Trip.findOne({ websiteTripId: trip.id }).lean())!._id);

    const b = await balances();
    expect(b['1111']).toBe(360);
    expect(b['1121']).toBe(0);
    expect(b['4110']).toBe(360);
    const audit = await fin().AuditLog.find({ action: 'DUCK_SYNC' }).lean();
    expect(audit.at(-1)?.details).toContain(pending.id);
    await expectBalancedBooks();
  });

  it('turns each payment entry into its own receipt (deposit, then balance)', async () => {
    const booking = await duckBooking();
    await duckCall(manualConfirm, booking, '/manual-confirm', supplierUser, { amount_paid: 200 });
    await drain();
    let state = await erpState(booking.id);
    expect(state.activeInvoice).toMatchObject({ paidAmount: 200, balance: 160, status: 'partially_paid' });

    await duckCall(collectBalance, booking, '/collect-balance', supplierUser, { amount: 160 });
    await drain();
    state = await erpState(booking.id);
    expect(state.receipts.map((r) => r.amount).sort()).toEqual([160, 200]);
    expect(state.activeInvoice).toMatchObject({ paidAmount: 360, balance: 0, status: 'paid' });
    expect((await balances())['1121']).toBe(0);
    await expectBalancedBooks();
  });

  it('receives a Kashier payment into 1115 and a manual one into the configured account', async () => {
    const kashier = await duckBooking({
      status: 'PAID',
      payment_method: 'KASHIER',
      order_id: 'kashier-order-1',
      amount_paid: 360,
    });
    process.env.FINANCE_DUCK_MANUAL_ACCOUNT = '1114';
    const manual = await duckBooking({ status: 'CONFIRMED', amount_paid: 180, payment_entries: [{ amount: 180, recorded_at: new Date(), note: '' }] });
    await drain();

    const k = await erpState(kashier.id);
    expect(k.receipts).toHaveLength(1);
    expect(k.receipts[0]).toMatchObject({ amount: 360, receivingAccountCode: '1115' });
    expect(k.link!.receipts[0].key).toBe('adj:1');
    expect(k.activeInvoice).toMatchObject({ status: 'paid', paymentMethod: 'Online Card Gateway' });
    const m = await erpState(manual.id);
    expect(m.receipts[0]).toMatchObject({ amount: 180, receivingAccountCode: '1114' });

    const b = await balances();
    expect(b['1115']).toBe(360);
    expect(b['1114']).toBe(180);
    await expectBalancedBooks();
  });

  it('reverses the invoice when a booking is cancelled before payment', async () => {
    const booking = await duckBooking({ status: 'CONFIRMED' });
    await drain();
    expect((await balances())['1121']).toBe(360);

    await duckCall(supplierCancel, booking, '/supplier-cancel', supplierUser, { reason: 'weather' });
    await drain();
    const { link, invoices, erpBooking } = await erpState(booking.id);
    expect(invoices).toHaveLength(1);
    expect(invoices[0].status).toBe('cancelled');
    expect(link!.invoices[0]).toMatchObject({ state: 'reversed' });
    const reversal = await fin().JournalEntry.findById(link!.invoices[0].reversalJournalId).lean();
    expect(reversal).toMatchObject({ isReversal: true, sourceDocument: 'Reversal' });
    expect(reversal!.date >= invoices[0].date).toBe(true);
    expect(erpBooking).toMatchObject({ status: 'Cancelled' });
    const b = await balances();
    expect(b['1121']).toBe(0);
    expect(b['4110']).toBe(0);
    await expectBalancedBooks();
  });

  it('keeps the money as owed when cancelled after payment, then books the refund', async () => {
    const booking = await duckBooking();
    await duckCall(manualConfirm, booking, '/manual-confirm', supplierUser, { amount_paid: 360 });
    await drain();
    await duckCall(supplierCancel, booking, '/supplier-cancel', supplierUser);
    await drain();

    let b = await balances();
    expect(b['4110']).toBe(0);
    expect(b['1111']).toBe(360);
    expect(b['1121']).toBe(-360); // owed back to the customer
    expect((await erpState(booking.id)).invoices[0].status).toBe('cancelled');

    const doc = (await Booking.findById(booking.id))!;
    expect(doc.status).toBe('REFUND_PENDING');
    await finalizeManualRefund(doc, 'refund');
    await drain();

    const { link, invoices } = await erpState(booking.id);
    expect(link!.refunds).toHaveLength(1);
    expect(link!.refunds[0].amount).toBe(360);
    expect(invoices[0].status).toBe('refunded');
    b = await balances();
    expect(b['1111']).toBe(0);
    expect(b['1121']).toBe(0);
    await expectBalancedBooks();
  });

  it('books a manual refund of a confirmed booking as a reversal plus a refund journal', async () => {
    const booking = await duckBooking();
    await duckCall(manualConfirm, booking, '/manual-confirm', supplierUser, { amount_paid: 360 });
    await drain();
    await duckCall(manualRefund, booking, '/manual-refund', supplierUser);
    await drain();
    const { link, invoices } = await erpState(booking.id);
    expect(invoices[0].status).toBe('refunded');
    expect(link!.refunds.map((r) => r.amount)).toEqual([360]);
    const refund = await fin().JournalEntry.findById(link!.refunds[0].journalId).lean();
    const lines = Object.fromEntries(refund!.lines.map((l) => [l.accountCode, l]));
    expect(lines['1121'].debit).toBe(360);
    expect(lines['1111'].credit).toBe(360);
    const b = await balances();
    expect(b['1111']).toBe(0);
    expect(b['4110']).toBe(0);
    await expectBalancedBooks();
  });

  it('re-issues the invoice on an upward edit and keeps the paid amount', async () => {
    const booking = await duckBooking({ amount: 180, subtotal: 180, quantity: 1, local_guests: 1 });
    await duckCall(manualConfirm, booking, '/manual-confirm', supplierUser, { amount_paid: 180 });
    await drain();

    await duckCall(editBooking, booking, '', supplierUser, { local_guests: 2, foreigner_guests: 0, quantity: 2 }, 'PATCH');
    await drain();
    const { link, invoices, activeInvoice, erpBooking } = await erpState(booking.id);
    expect(invoices).toHaveLength(2);
    expect(link!.invoices.map((i) => i.state)).toEqual(['reversed', 'active']);
    expect(invoices.find((i) => i._id === link!.invoices[0].invoiceId)!.status).toBe('cancelled');
    expect(activeInvoice).toMatchObject({ total: 360, paidAmount: 180, balance: 180, status: 'partially_paid' });
    expect(erpBooking).toMatchObject({ totalAmount: 360, depositPaid: 180, balanceDue: 180, invoiceNumber: activeInvoice!.invoiceNumber });
    const b = await balances();
    expect(b['4110']).toBe(360);
    expect(b['1121']).toBe(180);
    await expectBalancedBooks();
  });

  it('re-issues on a downward edit after payment, then books the refund once it is sent', async () => {
    const booking = await duckBooking({ amount: 540, subtotal: 540, quantity: 3, local_guests: 3 });
    await duckCall(manualConfirm, booking, '/manual-confirm', supplierUser, { amount_paid: 540 });
    await drain();
    await duckCall(editBooking, booking, '', supplierUser, { local_guests: 2, foreigner_guests: 0, quantity: 2 }, 'PATCH');
    await drain();

    let state = await erpState(booking.id);
    expect(state.activeInvoice).toMatchObject({ total: 360, paidAmount: 360, status: 'paid' });
    expect(state.link!.receipts).toHaveLength(1); // the edit's "refund owed" entry is not cash
    let b = await balances();
    expect(b['4110']).toBe(360);
    expect(b['1111']).toBe(540);
    expect(b['1121']).toBe(-180);

    await duckCall(refundSent, booking, '/refund-sent', supplierUser, { note: 'InstaPay' });
    await drain();
    state = await erpState(booking.id);
    expect(state.link!.refunds.map((r) => r.amount)).toEqual([180]);
    b = await balances();
    expect(b['1111']).toBe(360);
    expect(b['1121']).toBe(0);
    await expectBalancedBooks();
  });

  it('nets a discount code against revenue so the invoice total equals the booking amount', async () => {
    const booking = await duckBooking({
      status: 'CONFIRMED',
      amount: 360,
      subtotal: 400,
      pricing_snapshot: { price: 200, foreigner_price: 500, guide_price: 0 },
      discount: {
        code_id: new mongoose.Types.ObjectId(),
        code: 'NILE10',
        type: 'percentage',
        value: 10,
        max_discount: null,
        funded_by: 'supplier',
        amount: 40,
      },
    });
    await drain();
    const { activeInvoice } = await erpState(booking.id);
    expect(activeInvoice).toMatchObject({ subtotal: 400, discountTotal: 40, total: 360 });
    expect(activeInvoice!.lines[0]).toMatchObject({ grossAmount: 400, discount: 40, netAmount: 360 });
    expect(activeInvoice!.lines[0].notes).toContain('NILE10');
    const b = await balances();
    expect(b['4110']).toBe(360);
    expect(b['1121']).toBe(360);
    await expectBalancedBooks();
  });

  it('adds a guide line on the group/extras account', async () => {
    const booking = await duckBooking({
      status: 'CONFIRMED',
      wants_guide: true,
      amount: 560,
      subtotal: 560,
      pricing_snapshot: { price: 180, foreigner_price: 500, guide_price: 200 },
    });
    await drain();
    const { activeInvoice } = await erpState(booking.id);
    expect(activeInvoice!.lines.map((l) => [l.service, l.netAmount, l.revenueAccountCode])).toEqual([
      ['Kayak - Egyptian Guest', 360, '4110'],
      ['Tour guide', 200, '4150'],
    ]);
    const b = await balances();
    expect(b['4110']).toBe(360);
    expect(b['4150']).toBe(200);
    await expectBalancedBooks();
  });

  it('keeps only the money paid as revenue on a no-show', async () => {
    const booking = await duckBooking();
    await duckCall(manualConfirm, booking, '/manual-confirm', supplierUser, { amount_paid: 200 });
    await drain();
    await duckCall(setStatus, booking, '/status', supplierUser, { status: 'NO_SHOW' });
    await drain();
    const { activeInvoice } = await erpState(booking.id);
    expect(activeInvoice).toMatchObject({ total: 200, discountTotal: 160, status: 'paid' });
    const b = await balances();
    expect(b['4110']).toBe(200);
    expect(b['1121']).toBe(0);
    await expectBalancedBooks();
  });

  it('leaves other suppliers out entirely', async () => {
    const other = await createSupplierUser();
    const otherTrip = await createTrip(other.supplier._id);
    const booking = await createBooking({
      trip_id: otherTrip._id,
      supplier_id: other.supplier._id,
      status: 'CONFIRMED',
      amount: 180,
      amount_paid: 180,
    });
    await drain();
    expect(await fin().SyncOutbox.countDocuments({ refId: booking.id })).toBe(0);
    expect(await syncDuckBooking(booking.id)).toMatchObject({ outcome: 'skipped' });
    expect(await counts()).toMatchObject({ invoices: 0, receipts: 0, journals: 0, bookings: 0 });
    expect(await fin().Trip.countDocuments({ websiteTripId: otherTrip.id })).toBe(0);
  });

  it('posts nothing on replay', async () => {
    const booking = await duckBooking();
    await duckCall(manualConfirm, booking, '/manual-confirm', supplierUser, { amount_paid: 200 });
    await duckCall(collectBalance, booking, '/collect-balance', supplierUser);
    await drain();
    const before = await counts();
    const auditBefore = await fin().AuditLog.countDocuments();

    for (let i = 0; i < 3; i++) expect(await syncDuckBooking(booking.id)).toMatchObject({ outcome: 'unchanged', actions: [] });
    await Booking.updateOne({ _id: booking._id }, { $set: { updated_at: new Date() } });
    expect((await cron('GET')).status).toBe(200);
    await Promise.all([syncDuckBooking(booking.id), syncDuckBooking(booking.id)]);

    expect(await counts()).toEqual(before);
    expect(await fin().AuditLog.countDocuments()).toBe(auditBefore);
    await expectBalancedBooks();
  });

  it('keeps the trial balance balanced across a mix of bookings', async () => {
    const a = await duckBooking();
    const b = await duckBooking({ local_guests: 1, foreigner_guests: 1, amount: 680, subtotal: 680 });
    const c = await duckBooking({ status: 'CONFIRMED' });
    await duckCall(manualConfirm, a, '/manual-confirm', supplierUser, { amount_paid: 360 });
    await duckCall(manualConfirm, b, '/manual-confirm', supplierUser, { amount_paid: 340 });
    await drain();
    await duckCall(supplierCancel, c, '/supplier-cancel', supplierUser);
    await duckCall(manualRefund, a, '/manual-refund', supplierUser);
    await duckCall(collectBalance, b, '/collect-balance', supplierUser);
    await drain();

    const bal = await balances();
    expect(bal['4110']).toBe(680);
    expect(bal['1111']).toBe(680);
    expect(bal['1121']).toBe(0);
    await expectBalancedBooks();
  });

  it('mirrors Duck trips, and keeps their prices and delete read-only in the ERP', async () => {
    await drain();
    const mirrored = (await fin().Trip.findOne({ websiteTripId: trip.id }).lean())!;
    expect(mirrored).toMatchObject({ egyptianPrice: 180, foreignerPrice: 500, activityType: 'Kayak', duckSynced: true });

    trip.price = 200;
    await trip.save();
    await drain();
    const updated = (await fin().Trip.findById(mirrored._id).lean())!;
    expect(updated.egyptianPrice).toBe(200);
    expect(updated.priceAuditTrail[0]).toMatchObject({ oldEgyptianPrice: 180, newEgyptianPrice: 200, changedBy: 'Duck Sync' });

    const put = (body: unknown) => updateErpTrip(finRequest(`/trips/${mirrored._id}`, { method: 'PUT', token, body }), ctxParams({ id: mirrored._id }));
    expect((await put({ egyptianPrice: 999 })).status).toBe(400);
    expect((await put({ foreignerPrice: 1 })).status).toBe(400);
    expect((await put({ internalNotes: 'Bring water', egyptianPrice: 200 })).status).toBe(200);
    expect((await deleteErpTrip(finRequest(`/trips/${mirrored._id}`, { method: 'DELETE', token }), ctxParams({ id: mirrored._id }))).status).toBe(400);
    const sched = await scheduleErpPrice(
      finRequest(`/trips/${mirrored._id}/schedule-price`, { method: 'POST', token, body: { egyptianPrice: 300 } }),
      ctxParams({ id: mirrored._id }),
    );
    expect(sched.status).toBe(400);
    expect((await fin().Trip.findById(mirrored._id).lean())!.egyptianPrice).toBe(200);
  });

  it('makes synced bookings and their invoices read-only in the ERP', async () => {
    const booking = await duckBooking({ status: 'CONFIRMED' });
    await drain();
    const { erpBooking, activeInvoice } = await erpState(booking.id);
    const put = await updateErpBooking(
      finRequest(`/bookings/${erpBooking!._id}`, { method: 'PUT', token, body: { totalAmount: 1 } }),
      ctxParams({ id: erpBooking!._id }),
    );
    expect(put.status).toBe(400);
    const receipt = await createErpReceipt(
      finRequest('/customer-receipts', { method: 'POST', token, body: { invoiceId: activeInvoice!._id, amount: 100 } }),
    );
    expect(receipt.status).toBe(400);
    expect((await receipt.json()).error).toMatch(/Duck admin/);
  });

  it('fails closed when FINANCE_DUCK_SUPPLIER_ID is unset', async () => {
    delete process.env.FINANCE_DUCK_SUPPLIER_ID;
    const booking = await duckBooking();
    await duckCall(manualConfirm, booking, '/manual-confirm', supplierUser, { amount_paid: 360 });
    await flushFinanceSync();
    // (The trip row is from beforeEach, written while the id was still set.)
    expect(await fin().SyncOutbox.countDocuments({ kind: 'booking' })).toBe(0);
    expect(await syncDuckBooking(booking.id)).toMatchObject({ outcome: 'skipped', reason: 'sync disabled' });
    expect(await (await cron('GET')).json()).toMatchObject({ enabled: false });
    expect((await cron('POST', { from: '2020-01-01', dryRun: true })).status).toBe(400);
    expect(await counts()).toMatchObject({ invoices: 0, journals: 0, bookings: 0 });
  });

  it('reconciles bookings the hooks missed from the cron, which needs CRON_SECRET', async () => {
    delete process.env.FINANCE_DUCK_SUPPLIER_ID;
    const booking = await duckBooking({ status: 'CONFIRMED', amount_paid: 360, payment_entries: [{ amount: 360, recorded_at: new Date(), note: '' }] });
    await flushFinanceSync();
    process.env.FINANCE_DUCK_SUPPLIER_ID = supplier.id;

    expect((await cron('GET', undefined, 'wrong')).status).toBe(401);
    const res = await cron('GET');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ enabled: true, failed: 0 });
    const { activeInvoice, receipts } = await erpState(booking.id);
    expect(activeInvoice).toMatchObject({ total: 360, status: 'paid' });
    expect(receipts).toHaveLength(1);
    expect((await readSyncMeta()).reconciledAt).toBeTruthy();
  });

  it('records a failure in the audit log and retries it later', async () => {
    const booking = await duckBooking({ status: 'CONFIRMED', currency: 'USD' });
    await flushFinanceSync();
    const out = await processOutbox();
    expect(out.failed).toBe(1);
    const row = await fin().SyncOutbox.findById(`booking:${booking.id}`).lean();
    expect(row).toMatchObject({ status: 'failed', attempts: 1 });
    expect(row!.lastError).toMatch(/EGP only/);
    const audit = await fin().AuditLog.find({ action: 'DUCK_SYNC_FAILED' }).lean();
    expect(audit).toHaveLength(1);
    // Backed off: not retried until its time comes.
    expect((await processOutbox()).processed + (await processOutbox()).failed).toBe(0);
  });

  it('backfills from a go-live date: the dry run writes nothing, the real run is idempotent', async () => {
    delete process.env.FINANCE_DUCK_SUPPLIER_ID;
    await duckBooking({ status: 'CONFIRMED', amount_paid: 360, payment_entries: [{ amount: 360, recorded_at: new Date(), note: '' }] });
    await duckBooking({ status: 'CONFIRMED', amount: 180, subtotal: 180, quantity: 1, local_guests: 1 });
    await duckBooking({ status: 'PENDING' });
    await duckBooking({ status: 'CONFIRMED', booking_date: new Date('2020-03-01T10:00:00Z') });
    await flushFinanceSync();
    process.env.FINANCE_DUCK_SUPPLIER_ID = supplier.id;
    const from = '2021-01-01';

    const dry = await (await cron('POST', { from, dryRun: true })).json();
    expect(dry.scanned).toBe(3);
    expect(dry.months.reduce((s: number, m: { bookings: number }) => s + m.bookings, 0)).toBe(2);
    expect(dry.months.reduce((s: number, m: { revenue: number }) => s + m.revenue, 0)).toBe(540);
    expect(dry.months.reduce((s: number, m: { cashIn: number }) => s + m.cashIn, 0)).toBe(360);
    expect(await counts()).toMatchObject({ invoices: 0, receipts: 0, journals: 0, bookings: 0, customers: 0 });
    expect((await readSyncMeta()).goLive).toBeUndefined();

    const real = await (await cron('POST', { from, dryRun: false, limit: 2 })).json();
    expect(real.failures).toEqual([]);
    expect(real.next).toBeTruthy();
    const page2 = await (await cron('POST', { from, dryRun: false, limit: 2, after: real.next })).json();
    expect(page2.next).toBeNull();
    const after = await counts();
    expect(after).toMatchObject({ invoices: 2, receipts: 1, bookings: 2 });
    expect((await readSyncMeta()).goLive).toBe(from);

    await (await cron('POST', { from, dryRun: false })).json();
    expect(await counts()).toEqual(after);
    await expectBalancedBooks();
  });
});
