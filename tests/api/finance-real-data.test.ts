import { beforeEach, describe, expect, it } from 'vitest';
import { POST as createInvoice } from '@/app/api/v1/finance/invoices/route';
import { POST as createExpense } from '@/app/api/v1/finance/expenses/route';
import { POST as createJournal } from '@/app/api/v1/finance/journal-entries/route';
import { GET as getTourProfitability } from '@/app/api/v1/finance/tour-profitability/route';
import { GET as getCostCenters } from '@/app/api/v1/finance/cost-centers/profitability/route';
import { GET as getDashboard } from '@/app/api/v1/finance/dashboard/route';
import { GET as listSettlements, POST as createSettlement } from '@/app/api/v1/finance/provider-settlements/route';
import { POST as approveSettlement } from '@/app/api/v1/finance/provider-settlements/[id]/approve/route';
import { POST as paySettlement } from '@/app/api/v1/finance/provider-settlements/[id]/pay/route';
import { GET as listPurchases, POST as createPurchase } from '@/app/api/v1/finance/purchase-invoices/route';
import { POST as approvePurchase } from '@/app/api/v1/finance/purchase-invoices/[id]/approve/route';
import { POST as payPurchase } from '@/app/api/v1/finance/purchase-invoices/[id]/pay/route';
import { createFinanceUser, ctxParams, fin, finRequest, invoiceBody, thisMonthDate } from '../utils/finance';
import { seedFinance } from '../utils/finance';

type Handler = (r: Request, c?: never) => Promise<Response>;

async function call(handler: Handler, path: string, token: string, method: string, body?: unknown, params?: Record<string, string>) {
  const res = await (handler as unknown as (r: Request, c?: unknown) => Promise<Response>)(
    finRequest(path, { method, token, body }),
    params ? ctxParams(params) : undefined,
  );
  return { status: res.status, body: await res.json() };
}

type JLine = { accountCode: string; debit: number; credit: number; costCenter?: string };
async function journalOf(id: string) {
  const j = await fin().JournalEntry.findById(id).lean();
  return j!.lines as JLine[];
}
const line = (lines: JLine[], code: string) => lines.find((l) => l.accountCode === code);

describe('finance screens on real data', () => {
  let token: string;

  beforeEach(async () => {
    await seedFinance();
    ({ token } = await createFinanceUser('Super Admin'));
    await fin().TourType.create({ nameEn: 'Nile Kayak', nameAr: 'كاياك', duration: '2h' });
    await fin().TourType.create({ nameEn: 'Empty Tour', nameAr: 'فارغ', duration: '1h' });
  });

  describe('provider settlements', () => {
    async function setup() {
      const captain = await fin().Captain.create({ name: 'Captain Ali', phone: '1', commissionRate: 15, active: true });
      const day = thisMonthDate(10);
      const inv = await call(createInvoice, '/invoices', token, 'POST', invoiceBody({
        lines: [
          { tourType: 'Nile Kayak', service: 'Single Kayak', pax: 2, unitPrice: 500, discount: 0, captain: 'Captain Ali', revenueAccountCode: '4110', costCenter: 'CC-ELPH', activity: 'Kayak' },
          { tourType: 'Nile Kayak', service: 'Single Kayak', pax: 1, unitPrice: 1000, discount: 0, captain: 'Someone Else', revenueAccountCode: '4110', costCenter: 'CC-ELPH', activity: 'Kayak' },
        ],
      }));
      expect(inv.status).toBe(201);
      // An advance of 200 paid to the captain: Dr 1123 / Cr cash.
      const adv = await call(createJournal, '/journal-entries', token, 'POST', {
        date: day,
        description: 'Advance to Captain Ali',
        lines: [{ accountCode: '1123', debit: 200, credit: 0 }, { accountCode: '1111', debit: 0, credit: 200 }],
      });
      expect(adv.status).toBe(201);
      return { captain, start: thisMonthDate(1), end: thisMonthDate(28) };
    }

    it('computes commission from the captain’s posted lines and posts approve and pay journals', async () => {
      const { captain, start, end } = await setup();
      const created = await call(createSettlement, '/provider-settlements', token, 'POST', {
        providerId: captain._id, periodStart: start, periodEnd: end, advancesDeducted: 50,
      });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({
        status: 'draft', totalTrips: 1, grossRevenue: 1000, commissionRate: 15, commissionAmount: 150,
        advancesDeducted: 50, netPayable: 100, providerName: 'Captain Ali',
      });
      expect(await fin().JournalEntry.countDocuments({ sourceDocument: 'Settlement' })).toBe(0);

      const approved = await call(approveSettlement, '/x', token, 'POST', {}, { id: created.body.id });
      expect(approved.status).toBe(200);
      expect(approved.body.status).toBe('approved');
      const lines = await journalOf(approved.body.journalEntryId);
      expect(line(lines, '5110')).toMatchObject({ debit: 150, costCenter: 'CC-ELPH' });
      expect(line(lines, '1123')).toMatchObject({ credit: 50 });
      expect(line(lines, '2120')).toMatchObject({ credit: 100 });

      const paid = await call(paySettlement, '/x', token, 'POST', { paidFromAccountCode: '1112' }, { id: created.body.id });
      expect(paid.body.status).toBe('paid');
      const pay = await fin().JournalEntry.findOne({ sourceDocument: 'Settlement', sourceDocumentNumber: created.body.settlementNumber, description: /^Payment/ }).lean();
      expect(line(pay!.lines as JLine[], '2120')).toMatchObject({ debit: 100 });
      expect(line(pay!.lines as JLine[], '1112')).toMatchObject({ credit: 100 });

      const accounts = await fin().JournalEntry.aggregate([
        { $unwind: '$lines' },
        { $group: { _id: '$lines.accountCode', d: { $sum: '$lines.debit' }, c: { $sum: '$lines.credit' } } },
      ]);
      const bal = Object.fromEntries(accounts.map((a) => [a._id, a.d - a.c]));
      expect(bal['2120']).toBe(0); // payable settled
      expect(bal['1123']).toBe(150); // 200 advanced − 50 cleared

      expect((await call(listSettlements, '/provider-settlements', token, 'GET')).body).toHaveLength(1);
    });

    it('enforces the draft → approved → paid order, advance limits and permissions', async () => {
      const { captain, start, end } = await setup();
      const bad = await call(createSettlement, '/provider-settlements', token, 'POST', {
        providerId: captain._id, periodStart: start, periodEnd: end, advancesDeducted: 151,
      });
      expect(bad.status).toBe(400);
      const created = await call(createSettlement, '/provider-settlements', token, 'POST', { providerId: captain._id, periodStart: start, periodEnd: end });
      const early = await call(paySettlement, '/x', token, 'POST', {}, { id: created.body.id });
      expect(early.status).toBe(400);
      const overlap = await call(createSettlement, '/provider-settlements', token, 'POST', { providerId: captain._id, periodStart: start, periodEnd: end });
      expect(overlap.status).toBe(400);

      const { token: accountant } = await createFinanceUser('Accountant');
      const { token: cashier } = await createFinanceUser('Cashier');
      expect((await call(approveSettlement, '/x', accountant, 'POST', {}, { id: created.body.id })).status).toBe(403);
      expect((await call(approveSettlement, '/x', token, 'POST', {}, { id: created.body.id })).status).toBe(200);
      expect((await call(approveSettlement, '/x', token, 'POST', {}, { id: created.body.id })).status).toBe(400);
      expect((await call(paySettlement, '/x', cashier, 'POST', {}, { id: created.body.id })).status).toBe(200);
    });
  });

  describe('purchases', () => {
    const lines = [
      { description: 'Resin', quantity: 2, unitPrice: 300, expenseOrAssetAccountCode: '5210', costCenter: 'CC-KYK' },
      { description: 'New kayak', quantity: 1, unitPrice: 900, expenseOrAssetAccountCode: '1211' },
    ];

    it('posts Dr expense/asset, Cr 2110 on approval and pays down the balance, never above it', async () => {
      const created = await call(createPurchase, '/purchase-invoices', token, 'POST', { supplierName: 'Marine Gear', date: thisMonthDate(), lines });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ total: 1500, balance: 1500, paidAmount: 0, status: 'draft' });
      expect(await fin().JournalEntry.countDocuments({ sourceDocument: 'PurchaseInvoice' })).toBe(0);

      const approved = await call(approvePurchase, '/x', token, 'POST', {}, { id: created.body.id });
      expect(approved.body.status).toBe('posted');
      const jl = await journalOf(approved.body.journalEntryId);
      expect(line(jl, '5210')).toMatchObject({ debit: 600, costCenter: 'CC-KYK' });
      expect(line(jl, '1211')).toMatchObject({ debit: 900 });
      expect(line(jl, '2110')).toMatchObject({ credit: 1500 });
      expect((await fin().Supplier.findById(created.body.supplierId).lean())!.balance).toBe(1500);

      const partial = await call(payPurchase, '/x', token, 'POST', { amount: 500, paidFromAccountCode: '1112' }, { id: created.body.id });
      expect(partial.body).toMatchObject({ paidAmount: 500, balance: 1000, status: 'posted' });
      const pj = await fin().JournalEntry.findOne({ sourceDocument: 'SupplierPayment' }).lean();
      expect(line(pj!.lines as JLine[], '2110')).toMatchObject({ debit: 500 });
      expect(line(pj!.lines as JLine[], '1112')).toMatchObject({ credit: 500 });
      expect((await fin().Supplier.findById(created.body.supplierId).lean())!.balance).toBe(1000);

      const over = await call(payPurchase, '/x', token, 'POST', { amount: 1000.5 }, { id: created.body.id });
      expect(over.status).toBe(400);
      const rest = await call(payPurchase, '/x', token, 'POST', { amount: 1000 }, { id: created.body.id });
      expect(rest.body).toMatchObject({ paidAmount: 1500, balance: 0, status: 'paid' });
      expect((await call(payPurchase, '/x', token, 'POST', { amount: 1 }, { id: created.body.id })).status).toBe(400);
      expect((await fin().Supplier.findById(created.body.supplierId).lean())!.balance).toBe(0);
      expect((await call(listPurchases, '/purchase-invoices', token, 'GET')).body).toHaveLength(1);
    });

    it('rejects a revenue or liability account on a line and a payment on an unapproved bill', async () => {
      const bad = await call(createPurchase, '/purchase-invoices', token, 'POST', {
        supplierName: 'X', lines: [{ description: 'x', quantity: 1, unitPrice: 10, expenseOrAssetAccountCode: '4110' }],
      });
      expect(bad.status).toBe(400);
      const draft = await call(createPurchase, '/purchase-invoices', token, 'POST', { supplierName: 'X', lines: [{ description: 'x', quantity: 1, unitPrice: 10, expenseOrAssetAccountCode: '5160' }] });
      expect((await call(payPurchase, '/x', token, 'POST', { amount: 5 }, { id: draft.body.id })).status).toBe(400);
    });
  });

  describe('profitability, cost centers and dashboard', () => {
    async function book() {
      const day = thisMonthDate(10);
      await call(createInvoice, '/invoices', token, 'POST', invoiceBody({ taxAmount: 100 }));
      // Direct cost at CC-ELPH, an unattributed direct cost, and a non-direct expense.
      await call(createExpense, '/expenses', token, 'POST', { date: day, beneficiary: 'Captain', lines: [{ amount: 300, expenseAccountCode: '5110', costCenter: 'CC-ELPH', description: 'wages' }] });
      await call(createExpense, '/expenses', token, 'POST', { date: day, beneficiary: 'Fuel', lines: [{ amount: 50, expenseAccountCode: '5150', costCenter: '', description: 'fuel' }] });
      await call(createExpense, '/expenses', token, 'POST', { date: day, beneficiary: 'Landlord', lines: [{ amount: 200, expenseAccountCode: '5320', costCenter: 'CC-MAIN', description: 'rent' }] });
    }

    it('attributes posted direct costs to tour types, shows the rest as unallocated, and has no demo fallback', async () => {
      await book();
      const { body } = await call(getTourProfitability, '/tour-profitability', token, 'GET');
      const kayak = body.results.find((r: { tourTypeName: string }) => r.tourTypeName === 'Nile Kayak');
      const empty = body.results.find((r: { tourTypeName: string }) => r.tourTypeName === 'Empty Tour');
      expect(kayak).toMatchObject({ netRevenue: 1000, directCosts: 300, netProfit: 700, marginPct: 70, bookingCount: 1, totalPax: 2 });
      expect(empty).toMatchObject({ netRevenue: 0, directCosts: 0, netProfit: 0, marginPct: 0, bookingCount: 0 });
      expect(body).toMatchObject({ totalRevenue: 1000, totalCosts: 300, unallocatedCosts: 50, totalProfit: 700 });
    });

    it('respects the date range', async () => {
      await book();
      const out = await call(getTourProfitability, '/tour-profitability?startDate=2000-01-01&endDate=2000-01-31', token, 'GET');
      expect(out.body).toMatchObject({ totalRevenue: 0, totalCosts: 0, unallocatedCosts: 0, totalInvoicesCount: 0 });
      const inMonth = await call(getTourProfitability, `/tour-profitability?startDate=${thisMonthDate(1)}&endDate=${thisMonthDate(28)}`, token, 'GET');
      expect(inMonth.body.totalRevenue).toBe(1000);
    });

    it('computes revenue, direct cost, margin and margin % per cost center', async () => {
      await book();
      const { body } = await call(getCostCenters, '/cost-centers/profitability', token, 'GET');
      const elph = body.centers.find((c: { code: string }) => c.code === 'CC-ELPH');
      const main = body.centers.find((c: { code: string }) => c.code === 'CC-MAIN');
      expect(elph).toMatchObject({ revenue: 1000, directCost: 300, margin: 700, marginPct: 70 });
      expect(main).toMatchObject({ revenue: 0, directCost: 0, margin: 0, marginPct: 0 }); // rent is not a direct cost
      expect(body.unallocated).toEqual({ revenue: 0, directCost: 50 });
    });

    it('dashboard profit is revenue minus expense accounts, excluding tax and balance-sheet accounts', async () => {
      await book();
      const { body } = await call(getDashboard, '/dashboard', token, 'GET');
      // 1,000 revenue − (300 + 50 + 200) expenses; the 100 tax credited to 2150 is not profit.
      expect(body).toMatchObject({ revenue: 1000, expenses: 550, operatingProfit: 450, totalInvoiced: 1100 });
      expect(body.revenueByAccount).toEqual([expect.objectContaining({ code: '4110', amount: 1000 })]);
      expect(body.receivables).toBe(1100);
    });
  });
});
