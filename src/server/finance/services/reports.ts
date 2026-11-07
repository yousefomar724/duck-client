import type { AnomalyItem, TourTypeProfitability } from '@/lib/finance/erp-types';
import type { FinCtx } from './context';
import { isDirectCostAccount, ledgerLinesInRange } from './profit';
import { round2 } from './util';

/**
 * Net revenue per tour type from posted invoice lines, less the direct costs
 * (accounts under 5100 plus 5210) posted in the same date range. A cost line
 * belongs to the tour types whose revenue carries the same cost center (or,
 * when the line has none, the same activity), shared by net revenue. A cost
 * with no matching revenue is reported as `unallocatedCosts` and is not
 * spread across tour types.
 */
export async function getTourProfitability(ctx: FinCtx, startDate?: string, endDate?: string) {
  const tourTypes = await ctx.m.TourType.find().sort({ sortOrder: 1, createdAt: 1 }).lean().session(ctx.session);
  const filter: Record<string, unknown> = { status: { $nin: ['draft', 'pending_review', 'cancelled'] } };
  if (startDate || endDate) {
    filter.date = { ...(startDate ? { $gte: startDate } : {}), ...(endDate ? { $lte: endDate } : {}) };
  }
  const [invoices, costLines] = await Promise.all([
    ctx.m.Invoice.find(filter).lean().session(ctx.session),
    ledgerLinesInRange(ctx, startDate, endDate),
  ]);

  interface Acc {
    bookingCount: number;
    totalPax: number;
    grossRevenue: number;
    totalDiscount: number;
    netRevenue: number;
    cost: number;
    byCostCenter: Map<string, number>;
    byActivity: Map<string, number>;
  }
  const acc = new Map<string, Acc>(
    tourTypes.map((tt) => [
      tt._id,
      { bookingCount: 0, totalPax: 0, grossRevenue: 0, totalDiscount: 0, netRevenue: 0, cost: 0, byCostCenter: new Map(), byActivity: new Map() },
    ]),
  );
  const bump = (m: Map<string, number>, key: string, by: number) => {
    if (key) m.set(key, (m.get(key) ?? 0) + by);
  };

  for (const inv of invoices) {
    const seen = new Set<string>();
    for (const l of inv.lines) {
      const name = l.tourType || inv.tripType;
      const tt = tourTypes.find((t) => t.nameEn === name || t.nameAr === name);
      if (!tt) continue;
      const a = acc.get(tt._id)!;
      seen.add(tt._id);
      a.totalPax += Number(l.pax) || 1;
      a.grossRevenue += Number(l.grossAmount) || Number(l.pax) * Number(l.unitPrice) || 0;
      a.totalDiscount += Number(l.discount) || 0;
      a.netRevenue += Number(l.netAmount) || 0;
      bump(a.byCostCenter, l.costCenter, Number(l.netAmount) || 0);
      bump(a.byActivity, l.activity, Number(l.netAmount) || 0);
    }
    for (const id of seen) acc.get(id)!.bookingCount += 1;
  }

  let unallocatedCosts = 0;
  for (const line of costLines) {
    if (!isDirectCostAccount(line.accountCode)) continue;
    const amount = line.debit - line.credit;
    if (!amount) continue;
    const shares = (pick: (a: Acc) => Map<string, number>, key: string) =>
      [...acc.values()].map((a) => ({ a, w: Math.max(0, pick(a).get(key) ?? 0) })).filter((x) => x.w > 0);
    let matched = line.costCenter ? shares((a) => a.byCostCenter, line.costCenter) : [];
    if (matched.length === 0 && line.activity) matched = shares((a) => a.byActivity, line.activity);
    const weight = matched.reduce((s, x) => s + x.w, 0);
    if (weight <= 0) {
      unallocatedCosts += amount;
      continue;
    }
    for (const x of matched) x.a.cost += (amount * x.w) / weight;
  }

  const results: TourTypeProfitability[] = tourTypes.map((tt) => {
    const a = acc.get(tt._id)!;
    const netRevenue = round2(a.netRevenue);
    const directCosts = round2(a.cost);
    const netProfit = round2(netRevenue - directCosts);
    return {
      id: tt._id,
      tourTypeName: tt.nameEn,
      tourTypeNameAr: tt.nameAr,
      duration: tt.duration,
      bookingCount: a.bookingCount,
      totalPax: a.totalPax,
      grossRevenue: round2(a.grossRevenue),
      totalDiscount: round2(a.totalDiscount),
      netRevenue,
      directCosts,
      netProfit,
      marginPct: netRevenue > 0 ? Math.round((netProfit / netRevenue) * 1000) / 10 : 0,
    };
  });

  const totalRevenue = round2(results.reduce((s, r) => s + r.netRevenue, 0));
  const totalCosts = round2(results.reduce((s, r) => s + r.directCosts, 0));
  const totalProfit = round2(totalRevenue - totalCosts);
  return {
    startDate: startDate || null,
    endDate: endDate || null,
    totalInvoicesCount: invoices.length,
    totalRevenue,
    totalCosts,
    unallocatedCosts: round2(unallocatedCosts),
    totalProfit,
    overallMarginPct: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0,
    results,
  };
}

type Row = Record<string, unknown>;

/** Flags duplicates, missing amounts and capitalizable purchases in uploaded spreadsheet rows. Writes nothing. */
export function auditExcelRecords(records: unknown) {
  const rows = (Array.isArray(records) ? records : []).filter((r): r is Row => !!r && typeof r === 'object');
  const anomalies: AnomalyItem[] = [];
  const seen = new Set<string>();

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const sheet = typeof row.__sheet === 'string' ? row.__sheet : undefined;
    const invNum = row['Invoice Number'] || row['Invoice No'] || row['رقم الفاتورة'] || row['Inv#'];
    if (invNum) {
      if (seen.has(String(invNum))) {
        anomalies.push({
          id: `anom-${idx}-dup`,
          sheet: sheet || 'Invoice Log',
          row: rowNum,
          type: 'Duplicate',
          severity: 'Warning',
          message: `Duplicate invoice number detected: "${String(invNum)}". Requires manual review to prevent duplicate revenue recognition.`,
          recordData: row,
        });
      } else {
        seen.add(String(invNum));
      }
    }

    const amount = row['Amount'] || row['Net Amount'] || row['Total'] || row['المبلغ'] || row['السعر'];
    if (amount === undefined || amount === null || amount === '' || isNaN(Number(amount))) {
      anomalies.push({
        id: `anom-${idx}-amt`,
        sheet: sheet || 'Log',
        row: rowNum,
        type: 'Missing Value',
        severity: 'Error',
        message: `Missing or invalid numerical amount at row ${rowNum}.`,
        recordData: row,
      });
    }

    const desc = String(row['Description'] || row['Expense Type'] || row['Notes'] || row['البيان'] || '').toLowerCase();
    if (['kayak', 'sup board', 'شراء كاياك', 'شراء لوح', 'قارب'].some((k) => desc.includes(k))) {
      anomalies.push({
        id: `anom-${idx}-ast`,
        sheet: sheet || 'Expense_Log',
        row: rowNum,
        type: 'Misclassified Asset',
        severity: 'Warning',
        message: `Operational expense record appears to be an equipment acquisition ("${desc}"). Should be capitalized to Fixed Assets (1211) rather than expensed.`,
        recordData: row,
      });
    }
  });

  const errors = anomalies.filter((a) => a.severity === 'Error').length;
  const warnings = anomalies.filter((a) => a.severity === 'Warning').length;
  return { anomalies, summary: { total: rows.length, valid: rows.length - errors, warnings, errors } };
}
