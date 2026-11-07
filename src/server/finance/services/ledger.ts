import type {
  BalanceSheetItem,
  FinancialStatementBalanceSheet,
  FinancialStatementIncome,
  GeneralLedgerMovement,
  JournalEntry,
  TrialBalanceItem,
} from '@/lib/finance/erp-types';
import type { AccountDoc } from '../models/accounting';
import { LEDGER_STATUSES } from './accounts';
import type { FinCtx } from './context';

type LedgerJournal = Pick<
  JournalEntry,
  'date' | 'journalNumber' | 'sourceDocument' | 'sourceDocumentNumber' | 'description' | 'lines'
> & { _id: string };

/** Journals that count in the books, oldest first. */
async function ledgerJournals(ctx: FinCtx): Promise<LedgerJournal[]> {
  return ctx.m.JournalEntry.find({ status: { $in: [...LEDGER_STATUSES] } })
    .select('date journalNumber sourceDocument sourceDocumentNumber description lines')
    .sort({ date: 1, createdAt: 1, _id: 1 })
    .lean<LedgerJournal[]>()
    .session(ctx.session);
}

async function accountList(ctx: FinCtx): Promise<AccountDoc[]> {
  return ctx.m.Account.find().sort({ code: 1 }).lean<AccountDoc[]>().session(ctx.session);
}

export async function getGeneralLedger(
  ctx: FinCtx,
  accountCode?: string,
  startDate?: string,
  endDate?: string,
  costCenter?: string,
): Promise<GeneralLedgerMovement[]> {
  const [journals, accounts] = await Promise.all([ledgerJournals(ctx), accountList(ctx)]);
  const normalOf = new Map(accounts.map((a) => [a.code, a.normalBalance]));
  const movements: GeneralLedgerMovement[] = [];
  let runningBalance = 0;
  const normal = (accountCode && normalOf.get(accountCode)) || 'Debit';

  // Opening balance brought forward for a single account.
  if (accountCode && startDate) {
    let priorDr = 0;
    let priorCr = 0;
    for (const je of journals) {
      if (je.date >= startDate) continue;
      for (const line of je.lines) {
        if (line.accountCode !== accountCode) continue;
        if (costCenter && line.costCenter !== costCenter) continue;
        priorDr += Number(line.debit) || 0;
        priorCr += Number(line.credit) || 0;
      }
    }
    runningBalance = normal === 'Debit' ? priorDr - priorCr : priorCr - priorDr;
    movements.push({
      id: `gl-opening-${accountCode}`,
      date: startDate,
      journalNumber: 'OPENING',
      sourceDocument: 'OpeningBalance',
      sourceDocumentNumber: 'OB-BF',
      description: `الرصيد الافتتاحي المنقول حتى ${startDate} (Opening Balance B/F)`,
      debit:
        normal === 'Debit' && runningBalance > 0
          ? runningBalance
          : normal === 'Credit' && runningBalance < 0
            ? Math.abs(runningBalance)
            : 0,
      credit:
        normal === 'Credit' && runningBalance > 0
          ? runningBalance
          : normal === 'Debit' && runningBalance < 0
            ? Math.abs(runningBalance)
            : 0,
      runningBalance,
    });
  }

  for (const je of journals) {
    if (startDate && je.date < startDate) continue;
    if (endDate && je.date > endDate) continue;
    for (const line of je.lines) {
      if (accountCode && line.accountCode !== accountCode) continue;
      if (costCenter && line.costCenter !== costCenter) continue;
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      const lineNormal = normalOf.get(line.accountCode) || 'Debit';
      runningBalance += lineNormal === 'Debit' ? debit - credit : credit - debit;
      movements.push({
        id: `${je._id}-${line.id}`,
        date: je.date,
        journalNumber: je.journalNumber,
        sourceDocument: je.sourceDocument,
        sourceDocumentNumber: je.sourceDocumentNumber,
        description: line.description || je.description,
        debit,
        credit,
        runningBalance,
        costCenter: line.costCenter,
        activity: line.activity,
        location: line.location,
      });
    }
  }
  return movements;
}

export interface TrialBalance {
  rows: TrialBalanceItem[];
  totalOpeningDr: number;
  totalOpeningCr: number;
  totalPeriodDr: number;
  totalPeriodCr: number;
  totalClosingDr: number;
  totalClosingCr: number;
  isBalanced: boolean;
}

export async function getTrialBalance(ctx: FinCtx, startDate?: string, endDate?: string): Promise<TrialBalance> {
  const [journals, accounts] = await Promise.all([ledgerJournals(ctx), accountList(ctx)]);
  const rows: TrialBalanceItem[] = [];
  let totalOpeningDr = 0;
  let totalOpeningCr = 0;
  let totalPeriodDr = 0;
  let totalPeriodCr = 0;
  let totalClosingDr = 0;
  let totalClosingCr = 0;

  for (const acc of accounts) {
    if (!acc.isPosting) continue;
    let openingDebit = 0;
    let openingCredit = 0;
    let periodDebit = 0;
    let periodCredit = 0;

    for (const je of journals) {
      const isPrior = startDate ? je.date < startDate : je.sourceDocument === 'OpeningBalance';
      const isCurrentPeriod = startDate
        ? je.date >= startDate && (!endDate || je.date <= endDate)
        : je.sourceDocument !== 'OpeningBalance';
      for (const line of je.lines) {
        if (line.accountCode !== acc.code) continue;
        const dr = Number(line.debit) || 0;
        const cr = Number(line.credit) || 0;
        if (isPrior) {
          openingDebit += dr;
          openingCredit += cr;
        } else if (isCurrentPeriod) {
          periodDebit += dr;
          periodCredit += cr;
        }
      }
    }

    let netOpeningDr = 0;
    let netOpeningCr = 0;
    if (acc.normalBalance === 'Debit') {
      const net = openingDebit - openingCredit;
      if (net >= 0) netOpeningDr = net;
      else netOpeningCr = Math.abs(net);
    } else {
      const netCr = openingCredit - openingDebit;
      if (netCr >= 0) netOpeningCr = netCr;
      else netOpeningDr = Math.abs(netCr);
    }

    let closingDebit = 0;
    let closingCredit = 0;
    if (acc.normalBalance === 'Debit') {
      const totalNet = openingDebit + periodDebit - (openingCredit + periodCredit);
      if (totalNet >= 0) closingDebit = totalNet;
      else closingCredit = Math.abs(totalNet);
    } else {
      const totalNetCr = openingCredit + periodCredit - (openingDebit + periodDebit);
      if (totalNetCr >= 0) closingCredit = totalNetCr;
      else closingDebit = Math.abs(totalNetCr);
    }

    totalOpeningDr += netOpeningDr;
    totalOpeningCr += netOpeningCr;
    totalPeriodDr += periodDebit;
    totalPeriodCr += periodCredit;
    totalClosingDr += closingDebit;
    totalClosingCr += closingCredit;

    rows.push({
      accountCode: acc.code,
      nameAr: acc.nameAr,
      nameEn: acc.nameEn,
      type: acc.type,
      openingDebit: netOpeningDr,
      openingCredit: netOpeningCr,
      periodDebit,
      periodCredit,
      closingDebit,
      closingCredit,
    });
  }

  const isBalanced =
    Math.abs(totalPeriodDr - totalPeriodCr) < 0.01 &&
    Math.abs(totalClosingDr - totalClosingCr) < 0.01 &&
    Math.abs(totalOpeningDr - totalOpeningCr) < 0.01;

  return { rows, totalOpeningDr, totalOpeningCr, totalPeriodDr, totalPeriodCr, totalClosingDr, totalClosingCr, isBalanced };
}

export async function getFinancialStatements(
  ctx: FinCtx,
): Promise<{ incomeStatement: FinancialStatementIncome; balanceSheet: FinancialStatementBalanceSheet }> {
  const tb = await getTrialBalance(ctx);
  const revenueItems: BalanceSheetItem[] = [];
  const costOfRevItems: BalanceSheetItem[] = [];
  const opExpItems: BalanceSheetItem[] = [];
  const otherItems: BalanceSheetItem[] = [];
  const currentAssetItems: BalanceSheetItem[] = [];
  const fixedAssetItems: BalanceSheetItem[] = [];
  const currentLiabItems: BalanceSheetItem[] = [];
  const equityItems: BalanceSheetItem[] = [];

  for (const r of tb.rows) {
    const netExpenseOrAsset = r.periodDebit - r.periodCredit;
    const netRevenueOrLiab = r.periodCredit - r.periodDebit;
    const item = (amount: number) => ({ code: r.accountCode, nameEn: r.nameEn, nameAr: r.nameAr, amount });
    if (r.type === 'Revenue') revenueItems.push(item(netRevenueOrLiab));
    else if (r.type === 'Expense') {
      if (r.accountCode.startsWith('51')) costOfRevItems.push(item(netExpenseOrAsset));
      else opExpItems.push(item(netExpenseOrAsset));
    } else if (r.type === 'Asset') {
      if (r.accountCode.startsWith('12')) fixedAssetItems.push(item(netExpenseOrAsset));
      else currentAssetItems.push(item(netExpenseOrAsset));
    } else if (r.type === 'Liability') currentLiabItems.push(item(netRevenueOrLiab));
    else if (r.type === 'Equity') equityItems.push(item(netRevenueOrLiab));
  }

  const sum = (items: BalanceSheetItem[]) => items.reduce((s, i) => s + i.amount, 0);
  const totalRevenue = sum(revenueItems);
  const totalCostOfRevenue = sum(costOfRevItems);
  const grossProfit = totalRevenue - totalCostOfRevenue;
  const totalOperatingExpenses = sum(opExpItems);
  const operatingProfit = grossProfit - totalOperatingExpenses;
  const totalOther = sum(otherItems);
  const netProfit = operatingProfit + totalOther;

  const incomeStatement: FinancialStatementIncome = {
    revenue: revenueItems,
    totalRevenue,
    costOfRevenue: costOfRevItems,
    totalCostOfRevenue,
    grossProfit,
    operatingExpenses: opExpItems,
    totalOperatingExpenses,
    operatingProfit,
    otherIncomeAndExpenses: otherItems,
    totalOther,
    netProfit,
  };

  const totalAssets = sum(currentAssetItems) + sum(fixedAssetItems);
  const totalLiabilities = sum(currentLiabItems);
  const totalEquity = sum(equityItems) + netProfit;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const diff = Math.abs(totalAssets - totalLiabilitiesAndEquity);

  const balanceSheet: FinancialStatementBalanceSheet = {
    currentAssets: currentAssetItems,
    fixedAssets: fixedAssetItems,
    totalAssets,
    currentLiabilities: currentLiabItems,
    longTermLiabilities: [],
    totalLiabilities,
    equity: equityItems,
    currentPeriodProfit: netProfit,
    totalEquity,
    totalLiabilitiesAndEquity,
    isBalanced: diff < 0.05,
    difference: diff,
  };

  return { incomeStatement, balanceSheet };
}
