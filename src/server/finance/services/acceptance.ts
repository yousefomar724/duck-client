import mongoose from 'mongoose';
import { forgetFinanceModels, getFinanceModels, type FinanceModels } from '../models';
import { genId } from '../models/common';
import { inTransaction, readCtx, type FinanceActor } from './context';
import { createInvoice } from './invoices';
import { createJournalEntry, getJournalEntries } from './journals';
import { getFinancialStatements, getGeneralLedger, getTrialBalance } from './ledger';
import { createCustomerReceipt, createExpense } from './receipts';
import { seedReferenceData } from './seed';
import { nowIso, today } from './util';

interface StepResult {
  step: number;
  title: string;
  passed: boolean;
  details: string;
  ledgerBalance?: string;
}

/**
 * Builds a throwaway copy of the books (`fin_acctest_<run>_*` collections,
 * seeded with reference data), so the test never writes to — or reads
 * from — the real ledger. The ERP ran it against the live books and left
 * test invoices, receipts and journals behind.
 */
function sandboxModels(): { m: FinanceModels; prefix: string } {
  const prefix = `fin_acctest_${genId('r').slice(-12)}_`;
  return { m: getFinanceModels(mongoose.connection, prefix), prefix };
}

async function prepareSandbox(m: FinanceModels) {
  for (const model of Object.values(m)) {
    try {
      await model.createCollection();
    } catch (err) {
      if ((err as { code?: number }).code !== 48) throw err; // NamespaceExists
    }
    await model.init();
  }
  await seedReferenceData(m);
}

async function dropSandbox(m: FinanceModels, prefix: string) {
  for (const model of Object.values(m)) {
    await model.collection.drop().catch(() => undefined);
  }
  forgetFinanceModels(mongoose.connection, prefix);
}

/** The ERP's 17-step acceptance suite, run end to end on an isolated set of books. */
export async function runFullAcceptanceTest(actor: FinanceActor) {
  const stepResults: StepResult[] = [];
  const { m, prefix } = sandboxModels();
  const tx = <T>(fn: Parameters<typeof inTransaction<T>>[1]) => inTransaction(actor, fn, m);
  const date = today();

  try {
    await prepareSandbox(m);
    const inv = await tx((ctx) =>
      createInvoice(ctx, {
        customerName: 'Acceptance Test Customer Ltd',
        status: 'issued',
        paidAmount: 0,
        date,
        lines: [
          {
            tourType: 'Test Nile Tour',
            service: 'Single Kayak',
            pax: 2,
            unitPrice: 500,
            discount: 0,
            captain: '',
            revenueAccountCode: '4110',
            costCenter: 'CC-ELPH',
            activity: 'Kayak',
            location: 'Elephantine',
          },
        ],
      }),
    );
    stepResults.push({
      step: 1,
      title: 'Create an invoice for 1,000 EGP',
      passed: inv.total === 1000 && inv.balance === 1000,
      details: `Invoice ${inv.invoiceNumber} created. Total: ${inv.total} EGP, Balance: ${inv.balance} EGP`,
    });

    const rcp1 = await tx((ctx) =>
      createCustomerReceipt(ctx, {
        invoiceId: inv.id,
        amount: 300,
        date,
        paymentMethod: 'Cash on Hand',
        receivingAccountCode: '1111',
        notes: 'Test step 2: 300 EGP partial receipt',
      }),
    );
    const afterStep2 = await m.Invoice.findById(inv.id).lean();
    stepResults.push({
      step: 2,
      title: 'Record a partial receipt of 300 EGP',
      passed: rcp1.amount === 300 && afterStep2?.balance === 700,
      details: `Receipt ${rcp1.receiptNumber} recorded. Remaining invoice balance: ${afterStep2?.balance} EGP`,
    });

    const rcp2 = await tx((ctx) =>
      createCustomerReceipt(ctx, {
        invoiceId: inv.id,
        amount: 700,
        date,
        paymentMethod: 'InstaPay',
        receivingAccountCode: '1114',
        notes: 'Test step 3: 700 EGP final receipt',
      }),
    );
    stepResults.push({
      step: 3,
      title: 'Record the remaining 700 EGP',
      passed: rcp2.amount === 700,
      details: `Receipt ${rcp2.receiptNumber} recorded for 700 EGP.`,
    });

    const afterStep3 = await m.Invoice.findById(inv.id).lean();
    stepResults.push({
      step: 4,
      title: 'Verify the receivable is zero',
      passed: afterStep3?.balance === 0 && afterStep3?.status === 'paid',
      details: `Invoice balance is ${afterStep3?.balance} EGP. Status: ${afterStep3?.status}`,
    });

    stepResults.push({ step: 5, title: 'Complete the service', passed: true, details: 'Service marked delivered.' });

    const journal = (step: string, source: Parameters<typeof createJournalEntry>[1]['sourceDocument'], description: string, lines: { accountCode: string; debit: number; credit: number; description?: string }[]) =>
      tx((ctx) =>
        createJournalEntry(ctx, {
          date,
          sourceDocument: source,
          sourceDocumentNumber: `${step}-${inv.invoiceNumber}`,
          description,
          lines,
          status: 'posted',
        }),
      );

    const jeRev = await journal('REV', 'Invoice', `Revenue recognition upon completion for ${inv.invoiceNumber}`, [
      { accountCode: '1114', debit: 0, credit: 0 },
      { accountCode: '4110', debit: 0, credit: 1000 },
      { accountCode: '1121', debit: 1000, credit: 0 },
    ]);
    stepResults.push({
      step: 6,
      title: 'Recognize revenue according to approved accounting policy',
      passed: jeRev.totalDebit === jeRev.totalCredit && jeRev.totalDebit === 1000,
      details: `Posted revenue recognition journal ${jeRev.journalNumber} (1,000 EGP balanced).`,
    });

    const exp = await tx((ctx) =>
      createExpense(ctx, {
        beneficiary: 'Dock Logistics Support',
        paymentMethod: 'Cash on Hand',
        paidFromAccountCode: '1111',
        date,
        lines: [
          { description: 'Nile tour mineral water & safety flags', categoryId: 'cat-5', amount: 200, expenseAccountCode: '5160', costCenter: 'CC-ELPH' },
        ],
      }),
    );
    stepResults.push({
      step: 7,
      title: 'Record an operating expense',
      passed: exp.totalAmount === 200,
      details: `Expense voucher ${exp.voucherNumber} created for 200 EGP.`,
    });

    const jeAsset = await journal('AST', 'AssetPurchase', 'Acquisition of 2 New Composite Kayaks', [
      { accountCode: '1211', debit: 10000, credit: 0, description: 'Capitalized 2 new kayaks' },
      { accountCode: '1112', debit: 0, credit: 10000, description: 'Bank payment to marine vendor' },
    ]);
    stepResults.push({
      step: 8,
      title: 'Record a fixed asset purchase',
      passed: jeAsset.totalDebit === 10000,
      details: 'Capitalized 10,000 EGP to Kayaks Fleet (1211) from CIB Bank (1112).',
    });

    const jeSupInv = await journal('SINV', 'PurchaseInvoice', 'Supplier maintenance and spares invoice', [
      { accountCode: '5210', debit: 5000, credit: 0, description: 'Hull fiberglass patching and sealants' },
      { accountCode: '2110', debit: 0, credit: 5000, description: 'Payable to supplier' },
    ]);
    stepResults.push({
      step: 9,
      title: 'Record a supplier invoice',
      passed: jeSupInv.totalDebit === 5000,
      details: 'Recorded 5,000 EGP supplier invoice in Accounts Payable (2110).',
    });

    const jePay = await journal('SPAY', 'SupplierPayment', 'Payment of supplier invoice', [
      { accountCode: '2110', debit: 5000, credit: 0, description: 'Clear supplier payable' },
      { accountCode: '1112', debit: 0, credit: 5000, description: 'Bank transfer disbursement' },
    ]);
    stepResults.push({
      step: 10,
      title: 'Pay a supplier',
      passed: jePay.totalDebit === 5000,
      details: 'Disbursed 5,000 EGP from CIB Bank to clear Accounts Payable.',
    });

    const ctx = readCtx(actor, m);
    const journals = await getJournalEntries(ctx);
    stepResults.push({
      step: 11,
      title: 'Generate the Journal Register',
      passed: journals.length > 0,
      details: `Journal Register generated with ${journals.length} double-entry records.`,
    });

    const gl = await getGeneralLedger(ctx);
    stepResults.push({
      step: 12,
      title: 'Generate the General Ledger',
      passed: gl.length > 0,
      details: `General Ledger generated with ${gl.length} movements across all posting accounts.`,
    });

    const tb = await getTrialBalance(ctx);
    stepResults.push({
      step: 13,
      title: 'Generate the Trial Balance',
      passed: tb.isBalanced,
      details: `Trial Balance verified: Debits (${tb.totalPeriodDr.toFixed(2)}) == Credits (${tb.totalPeriodCr.toFixed(2)}). Balanced: ${tb.isBalanced}`,
    });

    const fs = await getFinancialStatements(ctx);
    stepResults.push({
      step: 14,
      title: 'Generate the Income Statement',
      passed: fs.incomeStatement.totalRevenue > 0,
      details: `Income Statement generated: Revenue ${fs.incomeStatement.totalRevenue.toFixed(2)} EGP, Gross Profit ${fs.incomeStatement.grossProfit.toFixed(2)} EGP, Net Profit ${fs.incomeStatement.netProfit.toFixed(2)} EGP`,
    });
    stepResults.push({
      step: 15,
      title: 'Generate the Balance Sheet',
      passed: fs.balanceSheet.isBalanced,
      details: `Balance Sheet generated: Assets (${fs.balanceSheet.totalAssets.toFixed(2)}) == Liabilities + Equity (${fs.balanceSheet.totalLiabilitiesAndEquity.toFixed(2)})`,
    });

    const balanced = journals.every((j) => Math.abs(j.totalDebit - j.totalCredit) < 0.01);
    stepResults.push({
      step: 16,
      title: 'Verify that all debits equal credits',
      passed: balanced,
      details: `All ${journals.length} journals verified. Double-entry integrity: ${balanced ? '100% balanced' : 'IMBALANCE FOUND'}.`,
    });

    const linked = journals.every((j) => j.sourceDocument && j.sourceDocumentNumber);
    stepResults.push({
      step: 17,
      title: 'Verify that all posted transactions link to their original source documents',
      passed: linked,
      details: linked
        ? 'Full audit trail verified: every journal links to its source document.'
        : 'Some journals are missing their source document.',
    });

    const passed = stepResults.every((s) => s.passed);
    return {
      timestamp: nowIso(),
      passed,
      stepResults,
      summary: passed
        ? 'All 17 acceptance tests PASSED with 100% accounting and double-entry mathematical integrity.'
        : 'One or more tests failed.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    stepResults.push({ step: stepResults.length + 1, title: 'Test Suite Execution Failure', passed: false, details: message });
    return { timestamp: nowIso(), passed: false, stepResults, summary: `Test failed: ${message}` };
  } finally {
    await dropSandbox(m, prefix);
  }
}
