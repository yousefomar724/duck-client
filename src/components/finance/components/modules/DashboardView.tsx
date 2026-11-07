import React, { useEffect, useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { currentMonth, monthRange } from '../../utils/period';
import {
  TrendingUp,
  CreditCard,
  DollarSign,
  AlertCircle,
  Ship,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { invoices, receipts, fixedAssets, fetchDashboard, formatMoney, lang, setActiveModule, t, journalEntries } = useErp();

  // Every KPI is read from the books for one month (the current one by default).
  const [month, setMonth] = useState<string>(currentMonth());
  const [summary, setSummary] = useState<any>(null);
  const { start, end } = monthRange(month);

  useEffect(() => {
    let cancelled = false;
    fetchDashboard(start, end)
      .then((data) => !cancelled && setSummary(data))
      .catch((err) => console.error('Error loading dashboard:', err));
    return () => {
      cancelled = true;
    };
  }, [start, end, journalEntries]);

  const inPeriod = (d: string) => d >= start && d <= end;
  const periodInvoices = invoices.filter((inv) => inPeriod(inv.date));
  const periodReceipts = receipts.filter((r) => inPeriod(r.date));

  const totalInvoiced = summary?.totalInvoiced ?? 0;
  const totalCollected = summary?.totalCollected ?? 0;
  const totalReceivables = summary?.receivables ?? 0;
  const operatingProfit = summary?.operatingProfit ?? 0;

  // Liquid funds across Cash & Banks (closing balances at the end of the period)
  const cashAcc = summary?.cash?.['1111'] ?? 0;
  const bankAcc = summary?.cash?.['1112'] ?? 0;
  const vodafoneAcc = summary?.cash?.['1113'] ?? 0;
  const instaAcc = summary?.cash?.['1114'] ?? 0;
  const totalLiquidity = cashAcc + bankAcc + vodafoneAcc + instaAcc;

  // Fleet Asset Total Value
  const totalFleetCost = fixedAssets.reduce((sum, a) => sum + a.acquisitionCost, 0);
  const totalFleetNetBook = fixedAssets.reduce((sum, a) => sum + a.netBookValue, 0);

  // Breakdown by activity: the 41xx revenue account balances in the period
  const activityRevenue: Record<string, number> = {};
  (summary?.revenueByAccount || []).forEach((r: any) => {
    activityRevenue[lang === 'ar' ? r.nameAr : r.nameEn] = r.amount;
  });
  const revenueTotal = Object.values(activityRevenue).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Summary Banner */}
      <div className="bg-gradient-to-r from-[#0c142b] to-[#0f213d] border border-slate-800 p-5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🦆</span>
            <h1 className="text-xl font-bold text-white tracking-wide">
              {lang === 'ar' ? 'لوحة القيادة المالية والتشغيلية' : 'Financial & Operational Command'}
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            {lang === 'ar'
              ? 'متابعة حية للفواتير والتحصيلات والمصروفات والأرصدة البنكية والأسطول النيلي'
              : 'Real-time performance of Nile activities, customer collections, expenses, and fleet valuation.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            aria-label={lang === 'ar' ? 'الفترة' : 'Period'}
            className="px-2.5 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 text-slate-200 rounded focus:outline-none focus:border-[#147d9f]"
          />
          <button
            onClick={() => setActiveModule('invoices')}
            className="px-3.5 py-2 text-xs font-semibold bg-[#147d9f] hover:bg-[#116986] text-white rounded shadow-sm transition-colors"
          >
            {lang === 'ar' ? '+ إصدار فاتورة' : '+ Issue Invoice'}
          </button>
          <button
            onClick={() => setActiveModule('excel_import')}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#fdfb45]" />
            <span>{lang === 'ar' ? 'استيراد إكسيل' : 'Excel Import Center'}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <div className="bg-[#0a0f21] border border-slate-800/80 p-4 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{lang === 'ar' ? 'إجمالي المبيعات المصدرة' : 'Total Invoiced'}</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{formatMoney(totalInvoiced)}</div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <span>{periodInvoices.length} {lang === 'ar' ? 'فاتورة مسجلة' : 'invoices issued'}</span>
          </div>
        </div>

        {/* Total Collections */}
        <div className="bg-[#0a0f21] border border-slate-800/80 p-4 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{lang === 'ar' ? 'التحصيلات النقدية والبنكية' : 'Total Collections'}</span>
            <CheckCircle2 className="w-4 h-4 text-[#147d9f]" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{formatMoney(totalCollected)}</div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <span>{periodReceipts.length} {lang === 'ar' ? 'سند قبض معتمد' : 'confirmed receipts'}</span>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-[#0a0f21] border border-slate-800/80 p-4 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{lang === 'ar' ? 'مستحقات العملاء المتبقية' : 'Outstanding Receivables'}</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 tracking-tight">{formatMoney(totalReceivables)}</div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <span>{lang === 'ar' ? 'تحت التحصيل' : 'Pending settlement'}</span>
          </div>
        </div>

        {/* Operating Profit */}
        <div className="bg-[#0a0f21] border border-slate-800/80 p-4 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{lang === 'ar' ? 'الربح التشغيلي للفترة' : 'Operating Profit'}</span>
            <DollarSign className="w-4 h-4 text-[#fdfb45]" />
          </div>
          <div className="text-2xl font-bold text-[#fdfb45] tracking-tight">{formatMoney(operatingProfit)}</div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <span>{lang === 'ar' ? 'الإيرادات - المصروفات' : 'Revenue minus expenses'}</span>
          </div>
        </div>
      </div>

      {/* Second Row: Liquidity & Activity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liquidity Breakdown Card */}
        <div className="bg-[#0a0f21] border border-slate-800/80 p-5 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-wide">
              {lang === 'ar' ? 'أرصدة الخزينة والحسابات' : 'Cash & Liquidity Snapshot'}
            </h2>
            <button
              onClick={() => setActiveModule('cash_banks')}
              className="text-xs text-[#147d9f] hover:underline"
            >
              {lang === 'ar' ? 'عرض التفاصيل' : 'View all'}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded border border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-xs text-slate-300 font-medium">
                  {lang === 'ar' ? 'الخزينة النقدية الرئيسية (1111)' : 'Main Cash on Hand'}
                </span>
              </div>
              <span className="text-xs font-semibold text-white font-mono">{formatMoney(cashAcc)}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded border border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                <span className="text-xs text-slate-300 font-medium">
                  {lang === 'ar' ? 'حساب بنك CIB مصر (1112)' : 'CIB Bank Account'}
                </span>
              </div>
              <span className="text-xs font-semibold text-white font-mono">{formatMoney(bankAcc)}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded border border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <span className="text-xs text-slate-300 font-medium">
                  {lang === 'ar' ? 'محفظة فودافون كاش (1113)' : 'Vodafone Cash Wallet'}
                </span>
              </div>
              <span className="text-xs font-semibold text-white font-mono">{formatMoney(vodafoneAcc)}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded border border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <span className="text-xs text-slate-300 font-medium">
                  {lang === 'ar' ? 'حساب إنستاباي - InstaPay (1114)' : 'InstaPay Account'}
                </span>
              </div>
              <span className="text-xs font-semibold text-white font-mono">{formatMoney(instaAcc)}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">{lang === 'ar' ? 'إجمالي السيولة النقدية' : 'Total Liquid Balance'}</span>
            <span className="text-sm font-bold text-[#fdfb45] font-mono">{formatMoney(totalLiquidity)}</span>
          </div>
        </div>

        {/* Revenue by Nile Activity */}
        <div className="bg-[#0a0f21] border border-slate-800/80 p-5 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-wide">
              {lang === 'ar' ? 'توزيع الإيرادات حسب النشاط' : 'Revenue by Activity'}
            </h2>
            <Ship className="w-4 h-4 text-[#147d9f]" />
          </div>

          <div className="space-y-3">
            {Object.entries(activityRevenue).map(([act, amount]) => {
              const pct = revenueTotal > 0 ? Math.round((amount / revenueTotal) * 100) : 0;
              return (
                <div key={act} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{act}</span>
                    <span className="text-slate-200 font-mono font-semibold">{formatMoney(amount)} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#147d9f] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
            {lang === 'ar'
              ? 'رحلات الكاياك وألواح التجديف تسجل أعلى معدلات الإشغال في مرسى إلفنتين'
              : 'Kayak & SUP tours maintain highest occupancy at Elephantine Island dock.'}
          </div>
        </div>

        {/* Nile Fleet & Equipment Valuation */}
        <div className="bg-[#0a0f21] border border-slate-800/80 p-5 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-wide">
              {lang === 'ar' ? 'أسطول دك وقيمة الأصول' : 'DUCK Nile Fleet Valuation'}
            </h2>
            <button
              onClick={() => setActiveModule('fixed_assets')}
              className="text-xs text-[#147d9f] hover:underline"
            >
              {lang === 'ar' ? 'سجل الأصول' : 'Asset Register'}
            </button>
          </div>

          <div className="p-3 bg-slate-900/60 rounded border border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{lang === 'ar' ? 'تكلفة اقتناء الأسطول التاريخية:' : 'Historical Fleet Cost:'}</span>
              <span className="text-slate-200 font-mono font-semibold">{formatMoney(totalFleetCost)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{lang === 'ar' ? 'صافي القيمة الدفترية الحالية:' : 'Net Book Value:'}</span>
              <span className="text-emerald-400 font-mono font-semibold">{formatMoney(totalFleetNetBook)}</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {fixedAssets.slice(0, 3).map((ast) => (
              <div key={ast.id} className="flex items-center justify-between py-1.5 border-b border-slate-800/40">
                <span className="text-slate-300 truncate max-w-[180px]">{lang === 'ar' ? ast.nameAr : ast.nameEn}</span>
                <span className="text-slate-400 font-mono">{formatMoney(ast.netBookValue)}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setActiveModule('fixed_assets')}
            className="w-full py-1.5 text-xs text-center font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          >
            {lang === 'ar' ? 'إجراء إهلاك شهري للأصول' : 'Run Monthly Depreciation'}
          </button>
        </div>
      </div>

      {/* Recent Invoices & Quick Reconciliation Audit */}
      <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              {lang === 'ar' ? 'أحدث الفواتير المسجلة' : 'Recent Invoices Log'}
            </h2>
            <p className="text-[11px] text-slate-400">
              {lang === 'ar' ? 'مستخرجة مباشرة من سجل العمليات' : 'Synced directly with operational register'}
            </p>
          </div>
          <button
            onClick={() => setActiveModule('invoices')}
            className="text-xs font-semibold text-[#147d9f] hover:underline"
          >
            {lang === 'ar' ? 'عرض كافة الفواتير' : 'View all invoices'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c142b] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800/80">
              <tr>
                <th className="py-2.5 px-4">{lang === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</th>
                <th className="py-2.5 px-4">{lang === 'ar' ? 'العميل' : 'Customer'}</th>
                <th className="py-2.5 px-4">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="py-2.5 px-4">{lang === 'ar' ? 'الموقع والكابتن' : 'Location & Captain'}</th>
                <th className="py-2.5 px-4 text-right">{lang === 'ar' ? 'المبلغ الصافي' : 'Net Total'}</th>
                <th className="py-2.5 px-4 text-right">{lang === 'ar' ? 'المتبقي' : 'Balance'}</th>
                <th className="py-2.5 px-4 text-center">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-200">
              {invoices.slice(0, 5).map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-[#147d9f]">{inv.invoiceNumber}</td>
                  <td className="py-2.5 px-4 font-medium">{inv.customerName}</td>
                  <td className="py-2.5 px-4 text-slate-400">{inv.date}</td>
                  <td className="py-2.5 px-4 text-slate-300">
                    {inv.location} <span className="text-slate-400">·</span> {inv.captain}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold">{formatMoney(inv.total)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-amber-300 font-semibold">
                    {formatMoney(inv.balance)}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span
                      className={`inline-block text-[11px] font-semibold ${
                        inv.status === 'paid'
                          ? 'text-emerald-400'
                          : inv.status === 'partially_paid'
                          ? 'text-amber-400'
                          : 'text-blue-400'
                      }`}
                    >
                      {inv.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
