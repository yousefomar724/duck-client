import mongoose from 'mongoose';
import { beforeEach, describe, expect, it } from 'vitest';
import { POST as createInvoice } from '@/app/api/v1/finance/invoices/route';
import { POST as createReceipt } from '@/app/api/v1/finance/customer-receipts/route';
import { POST as createJournal } from '@/app/api/v1/finance/journal-entries/route';
import { POST as reverseJournal } from '@/app/api/v1/finance/journal-entries/[id]/reverse/route';
import { POST as lockPeriod } from '@/app/api/v1/finance/periods/[id]/lock/route';
import { POST as unlockPeriod } from '@/app/api/v1/finance/periods/[id]/unlock/route';
import { GET as getAccounts } from '@/app/api/v1/finance/accounts/route';
import { GET as getTrialBalance } from '@/app/api/v1/finance/trial-balance/route';
import { POST as createTrip } from '@/app/api/v1/finance/trips/route';
import { POST as createBooking } from '@/app/api/v1/finance/bookings/route';
import { POST as convertBooking } from '@/app/api/v1/finance/bookings/[id]/convert-to-invoice/route';
import { POST as runAcceptance } from '@/app/api/v1/finance/acceptance-test/run/route';
import { GET as getAuditLogs } from '@/app/api/v1/finance/audit-logs/route';
import { DELETE as deleteActivityType } from '@/app/api/v1/finance/activity-types/[id]/route';
import { ensureFinanceSeed, seedReferenceData } from '@/server/finance/services/seed';
import { createFinanceUser, ctxParams, fin, finRequest, invoiceBody, periodIdOf, seedFinance, thisMonthDate } from '../utils/finance';

type Line = { accountCode: string; debit: number; credit: number };

async function post(handler: (r: Request) => Promise<Response>, path: string, token: string, body: unknown) {
  const res = await handler(finRequest(path, { method: 'POST', token, body }));
  return { status: res.status, body: await res.json() };
}

async function balances(token: string): Promise<Record<string, number>> {
  const res = await getAccounts(finRequest('/accounts', { token }));
  const accounts: { code: string; balance: number }[] = await res.json();
  return Object.fromEntries(accounts.map((a) => [a.code, a.balance]));
}

describe('finance ledger', () => {
  let token: string;

  beforeEach(async () => {
    await seedFinance();
    ({ token } = await createFinanceUser('Super Admin'));
  });

  it('posts a balanced double-entry journal for an invoice and keeps the trial balance balanced', async () => {
    const { status, body: inv } = await post(createInvoice, '/invoices', token, invoiceBody({ paidAmount: 400 }));
    expect(status).toBe(201);
    expect(inv).toMatchObject({ total: 1000, paidAmount: 400, balance: 600, status: 'partially_paid' });
    expect(typeof inv.id).toBe('string');

    const journal = await fin().JournalEntry.findById(inv.journalEntryId).lean();
    expect(journal).toBeTruthy();
    expect(journal!.totalDebit).toBe(1000);
    expect(journal!.totalCredit).toBe(1000);
    const byAccount = Object.fromEntries((journal!.lines as Line[]).map((l) => [l.accountCode, l]));
    expect(byAccount['1111'].debit).toBe(400);
    expect(byAccount['1121'].debit).toBe(600);
    expect(byAccount['4110'].credit).toBe(1000);

    const b = await balances(token);
    expect(b['1111']).toBe(400);
    expect(b['1121']).toBe(600);
    expect(b['4110']).toBe(1000);

    const tb = await (await getTrialBalance(finRequest('/trial-balance', { token }))).json();
    expect(tb.isBalanced).toBe(true);
    expect(tb.totalPeriodDr).toBe(1000);
  });

  it('credits invoice tax to 2150 so taxed invoices balance', async () => {
    const { status, body: inv } = await post(createInvoice, '/invoices', token, invoiceBody({ taxAmount: 140 }));
    expect(status).toBe(201);
    expect(inv.total).toBe(1140);
    const journal = await fin().JournalEntry.findById(inv.journalEntryId).lean();
    const tax = (journal!.lines as Line[]).find((l) => l.accountCode === '2150');
    expect(tax).toMatchObject({ debit: 0, credit: 140 });
    expect(journal!.totalDebit).toBe(1140);
    expect(journal!.totalCredit).toBe(1140);
    expect((await balances(token))['2150']).toBe(140);
  });

  it('nets discounts against revenue', async () => {
    const body = invoiceBody();
    body.lines[0] = { ...body.lines[0], discount: 100 };
    const { body: inv } = await post(createInvoice, '/invoices', token, body);
    expect(inv).toMatchObject({ subtotal: 1000, discountTotal: 100, total: 900 });
    expect((await balances(token))['4110']).toBe(900);
  });

  it('rejects an unbalanced manual journal', async () => {
    const res = await post(createJournal, '/journal-entries', token, {
      date: thisMonthDate(),
      description: 'bad',
      status: 'posted',
      lines: [
        { accountCode: '1111', debit: 100, credit: 0 },
        { accountCode: '4110', debit: 0, credit: 90 },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Double-entry rule violation/);
    expect(await fin().JournalEntry.countDocuments()).toBe(0);
  });

  it('derives the period from the document date and blocks locked periods without writing anything', async () => {
    const date = '2025-03-10';
    const { body: inv } = await post(createInvoice, '/invoices', token, invoiceBody({ date }));
    const journal = await fin().JournalEntry.findById(inv.journalEntryId).lean();
    expect(journal!.periodId).toBe('p-2025-03');
    expect(inv.invoiceNumber).toBe('INV-2025-0001');

    const lockRes = await lockPeriod(
      finRequest('/periods/p-2025-03/lock', { method: 'POST', token }),
      ctxParams({ id: 'p-2025-03' }),
    );
    expect(lockRes.status).toBe(200);

    const before = {
      invoices: await fin().Invoice.countDocuments(),
      journals: await fin().JournalEntry.countDocuments(),
      customers: await fin().Customer.countDocuments(),
    };
    const blocked = await post(createInvoice, '/invoices', token, invoiceBody({ date: '2025-03-20', customerName: 'Late Guest' }));
    expect(blocked.status).toBe(400);
    expect(blocked.body.error).toMatch(/Cannot post into March 2025: Period is Locked/);
    expect(await fin().Invoice.countDocuments()).toBe(before.invoices);
    expect(await fin().JournalEntry.countDocuments()).toBe(before.journals);
    expect(await fin().Customer.countDocuments()).toBe(before.customers);

    // Another month still posts, and the rolled-back attempt did not burn a number.
    const other = await post(createInvoice, '/invoices', token, invoiceBody({ date: thisMonthDate() }));
    expect(other.status).toBe(201);

    await unlockPeriod(finRequest('/periods/p-2025-03/unlock', { method: 'POST', token }), ctxParams({ id: 'p-2025-03' }));
    const after = await post(createInvoice, '/invoices', token, invoiceBody({ date: '2025-03-20' }));
    expect(after.status).toBe(201);
    expect(after.body.invoiceNumber).toBe('INV-2025-0002');
  });

  it('applies receipts to the invoice and rejects overpayment', async () => {
    const { body: inv } = await post(createInvoice, '/invoices', token, invoiceBody());
    const partial = await post(createReceipt, '/customer-receipts', token, { invoiceId: inv.id, amount: 300, paymentMethod: 'Cash on Hand' });
    expect(partial.status).toBe(201);
    expect((await fin().Invoice.findById(inv.id).lean())!.balance).toBe(700);

    const journalsBefore = await fin().JournalEntry.countDocuments();
    const over = await post(createReceipt, '/customer-receipts', token, { invoiceId: inv.id, amount: 700.5, paymentMethod: 'Cash on Hand' });
    expect(over.status).toBe(400);
    expect(over.body.error).toMatch(/exceeds the open balance/);
    expect(await fin().Receipt.countDocuments()).toBe(1);
    expect(await fin().JournalEntry.countDocuments()).toBe(journalsBefore);
    expect((await fin().Invoice.findById(inv.id).lean())!.balance).toBe(700);

    const rest = await post(createReceipt, '/customer-receipts', token, { invoiceId: inv.id, amount: 700, paymentMethod: 'InstaPay' });
    expect(rest.status).toBe(201);
    const paid = (await fin().Invoice.findById(inv.id).lean())!;
    expect(paid).toMatchObject({ balance: 0, status: 'paid', paidAmount: 1000 });

    const again = await post(createReceipt, '/customer-receipts', token, { invoiceId: inv.id, amount: 1, paymentMethod: 'Cash' });
    expect(again.status).toBe(400);

    const b = await balances(token);
    expect(b['1121']).toBe(0);
    expect(b['1111']).toBe(300);
    expect(b['1114']).toBe(700);
  });

  it('rejects an invoice paid beyond its total', async () => {
    const res = await post(createInvoice, '/invoices', token, invoiceBody({ paidAmount: 1500 }));
    expect(res.status).toBe(400);
  });

  it('numbers documents from atomic counters, unique under concurrency, ignoring client numbers', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        post(createInvoice, '/invoices', token, invoiceBody({ invoiceNumber: 'INV-2026-101', customerName: `Guest ${i}` })),
      ),
    );
    expect(results.every((r) => r.status === 201)).toBe(true);
    const year = thisMonthDate().slice(0, 4);
    const numbers = results.map((r) => r.body.invoiceNumber).sort();
    expect(numbers).toEqual(Array.from({ length: 6 }, (_, i) => `INV-${year}-${String(i + 1).padStart(4, '0')}`));

    const journalNumbers = (await fin().JournalEntry.find().lean()).map((j) => j.journalNumber);
    expect(new Set(journalNumbers).size).toBe(journalNumbers.length);

    const receipts = await Promise.all(
      results.slice(0, 3).map((r) => post(createReceipt, '/customer-receipts', token, { invoiceId: r.body.id, amount: 10 })),
    );
    expect(new Set(receipts.map((r) => r.body.receiptNumber)).size).toBe(3);
  });

  it('opens a missing month once when several postings into it arrive together', async () => {
    const results = await Promise.all(
      Array.from({ length: 4 }, (_, i) => post(createInvoice, '/invoices', token, invoiceBody({ date: `2024-07-0${i + 1}` }))),
    );
    expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201]);
    const period = await fin().Period.findById('p-2024-07').lean();
    expect(period).toMatchObject({ status: 'Open', name: 'July 2024', endDate: '2024-07-31' });
  });

  it('keeps a reversed journal in the books so it nets to zero with its reversal', async () => {
    const { body: je } = await post(createJournal, '/journal-entries', token, {
      date: thisMonthDate(),
      description: 'Owner capital',
      status: 'posted',
      lines: [
        { accountCode: '1112', debit: 5000, credit: 0 },
        { accountCode: '3100', debit: 0, credit: 5000 },
      ],
    });
    expect(je.journalNumber).toMatch(/^JV-\d{4}-0001$/);
    expect(je.periodId).toBe(periodIdOf(thisMonthDate()));
    const rev = await reverseJournal(
      finRequest(`/journal-entries/${je.id}/reverse`, { method: 'POST', token, body: { reason: 'typo' } }),
      ctxParams({ id: je.id }),
    );
    expect(rev.status).toBe(200);
    const b = await balances(token);
    expect(b['1112']).toBe(0);
    expect(b['3100']).toBe(0);

    const twice = await reverseJournal(
      finRequest(`/journal-entries/${je.id}/reverse`, { method: 'POST', token, body: {} }),
      ctxParams({ id: je.id }),
    );
    expect(twice.status).toBe(400);
  });

  it('does not invent captains, customers or website references', async () => {
    const noCustomer = await post(createReceipt, '/customer-receipts', token, { amount: 50 });
    expect(noCustomer.status).toBe(400);

    const noName = await post(createInvoice, '/invoices', token, invoiceBody({ customerName: '', customerId: 'c-001' }));
    expect(noName.status).toBe(400);

    const { body: trip } = await post(createTrip, '/trips', token, { name: 'Kayak – Free Tour', egyptianPrice: 180, foreignerPrice: 500 });
    const { status, body: booking } = await post(createBooking, '/bookings', token, {
      tripId: trip.id,
      customerName: 'Mona',
      egyptianPax: 2,
      foreignerPax: 1,
      depositPaid: 200,
    });
    expect(status).toBe(201);
    expect(booking.websiteRef).toBeUndefined();
    expect(booking.bookingNumber).toMatch(/^BKG-\d{4}-0001$/);
    expect(booking.totalAmount).toBe(860);

    const conv = await convertBooking(
      finRequest(`/bookings/${booking.id}/convert-to-invoice`, { method: 'POST', token }),
      ctxParams({ id: booking.id }),
    );
    expect(conv.status).toBe(201);
    const inv = await conv.json();
    expect(inv.lines.every((l: { captain: string }) => l.captain === '')).toBe(true);
    expect(inv.captain).toBe('');
    expect(inv.bookingRef).toBe(booking.bookingNumber);
    const customer = await fin().Customer.findById(inv.customerId).lean();
    expect(customer!.nationality).toBe('');
    expect(inv).toMatchObject({ total: 860, paidAmount: 200, balance: 660 });
  });

  it('runs the acceptance suite on throwaway collections and leaves the real books untouched', async () => {
    const res = await runAcceptance(finRequest('/acceptance-test/run', { method: 'POST', token }));
    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.stepResults).toHaveLength(17);
    expect(result.passed).toBe(true);

    expect(await fin().Invoice.countDocuments()).toBe(0);
    expect(await fin().JournalEntry.countDocuments()).toBe(0);
    expect(await fin().Receipt.countDocuments()).toBe(0);
    const names = (await mongoose.connection.db!.listCollections().toArray()).map((c) => c.name);
    expect(names.some((n) => n.startsWith('fin_acctest_'))).toBe(false);
  });

  it('keeps the whole audit trail (no 500-entry cap) and pages through it', async () => {
    await fin().AuditLog.insertMany(
      Array.from({ length: 520 }, (_, i) => ({
        timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
        userId: 'u',
        userName: 'Seeder',
        action: 'TEST',
        entity: 'Test',
        entityId: String(i),
        details: '',
      })),
    );
    await post(createInvoice, '/invoices', token, invoiceBody());
    expect(await fin().AuditLog.countDocuments()).toBeGreaterThan(520);

    const page = await (await getAuditLogs(finRequest('/audit-logs?limit=500', { token }))).json();
    expect(page).toHaveLength(500);
    const older = await (
      await getAuditLogs(finRequest(`/audit-logs?limit=500&before=${encodeURIComponent(page[499].timestamp)}`, { token }))
    ).json();
    expect(older.length).toBeGreaterThan(0);
  });

  it('seeds reference data once and never brings deleted rows back', async () => {
    expect(await fin().Account.countDocuments()).toBe(64);
    expect(await fin().Period.countDocuments()).toBe(12);
    expect(await fin().Booking.countDocuments()).toBe(0);
    expect(await fin().Trip.countDocuments()).toBe(0);
    expect(await fin().Customer.countDocuments()).toBe(0);

    const del = await deleteActivityType(
      finRequest('/activity-types/act-1', { method: 'DELETE', token }),
      ctxParams({ id: 'act-1' }),
    );
    expect(del.status).toBe(200);

    expect((await seedReferenceData()).applied).toBe(false);
    global._financeSeed = undefined;
    await ensureFinanceSeed();
    expect(await fin().ActivityType.exists({ _id: 'act-1' })).toBeNull();
  });
});
