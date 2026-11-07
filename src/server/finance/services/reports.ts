import type { AnomalyItem, TourTypeProfitability } from '@/lib/finance/erp-types';
import type { FinCtx } from './context';

/**
 * Ported unchanged, including the ERP's fallback demo figures for tour types
 * with no invoices and its flat 27% direct-cost estimate. Replacing those
 * with real costs is a later session's job (see docs/finance/core-notes.md).
 */
export async function getTourProfitability(ctx: FinCtx, startDate?: string, endDate?: string) {
  const tourTypes = await ctx.m.TourType.find().sort({ sortOrder: 1, createdAt: 1 }).lean().session(ctx.session);
  const filter: Record<string, unknown> = { status: { $ne: 'cancelled' } };
  if (startDate || endDate) {
    filter.date = { ...(startDate ? { $gte: startDate } : {}), ...(endDate ? { $lte: endDate } : {}) };
  }
  const invoices = await ctx.m.Invoice.find(filter).lean().session(ctx.session);

  const results: TourTypeProfitability[] = tourTypes.map((tt) => {
    let bookingCount = 0;
    let totalPax = 0;
    let grossRevenue = 0;
    let totalDiscount = 0;
    let netRevenue = 0;
    for (const inv of invoices) {
      const matching = inv.lines.filter(
        (l) => l.tourType === tt.nameEn || l.tourType === tt.nameAr || inv.tripType === tt.nameEn || inv.tripType === tt.nameAr,
      );
      if (matching.length === 0) continue;
      bookingCount += 1;
      for (const l of matching) {
        totalPax += Number(l.pax) || 1;
        grossRevenue += Number(l.grossAmount) || Number(l.pax) * Number(l.unitPrice) || 0;
        totalDiscount += Number(l.discount) || 0;
        netRevenue += Number(l.netAmount) || 0;
      }
    }
    if (netRevenue === 0) {
      if (tt._id === 'tt-1') { netRevenue = 64000; totalPax = 160; bookingCount = 38; grossRevenue = 68000; totalDiscount = 4000; }
      else if (tt._id === 'tt-2') { netRevenue = 92000; totalPax = 185; bookingCount = 52; grossRevenue = 97000; totalDiscount = 5000; }
      else if (tt._id === 'tt-3') { netRevenue = 58000; totalPax = 95; bookingCount = 28; grossRevenue = 61000; totalDiscount = 3000; }
      else if (tt._id === 'tt-4') { netRevenue = 84000; totalPax = 110; bookingCount = 34; grossRevenue = 89000; totalDiscount = 5000; }
      else { netRevenue = 28000; totalPax = 70; bookingCount = 22; grossRevenue = 29500; totalDiscount = 1500; }
    }
    const directCosts = Math.round(netRevenue * 0.27);
    const netProfit = netRevenue - directCosts;
    return {
      id: tt._id,
      tourTypeName: tt.nameEn,
      tourTypeNameAr: tt.nameAr,
      duration: tt.duration,
      bookingCount,
      totalPax,
      grossRevenue,
      totalDiscount,
      netRevenue,
      directCosts,
      netProfit,
      marginPct: netRevenue > 0 ? Math.round((netProfit / netRevenue) * 1000) / 10 : 0,
    };
  });

  const totalRevenue = results.reduce((s, r) => s + r.netRevenue, 0);
  const totalCosts = results.reduce((s, r) => s + r.directCosts, 0);
  const totalProfit = totalRevenue - totalCosts;
  return {
    startDate: startDate || null,
    endDate: endDate || null,
    totalInvoicesCount: invoices.length,
    totalRevenue,
    totalCosts,
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
