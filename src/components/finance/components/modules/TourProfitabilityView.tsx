import React, { useState, useEffect } from 'react';
import { useErp } from '../../context/ErpContext';
import { TourTypeProfitability } from '../../types/erp';
import {
  TrendingUp,
  Calendar,
  Search,
  Filter,
  Download,
  DollarSign,
  Users,
  Ship,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const TourProfitabilityView: React.FC = () => {
  const { fetchTourProfitability, invoices, formatMoney, lang, theme } = useErp();

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<{
    totalInvoicesCount: number;
    totalRevenue: number;
    totalCosts: number;
    totalProfit: number;
    overallMarginPct: number;
    results: TourTypeProfitability[];
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchTourProfitability(startDate, endDate);
      setReportData(data);
    } catch (err) {
      console.error('Error loading tour profitability:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const handleExportExcel = () => {
    if (!reportData) return;
    const exportRows = reportData.results.map((r) => ({
      'Tour Type': r.tourTypeName,
      'نوع الرحلة': r.tourTypeNameAr,
      'Duration / المدة': r.duration,
      'Bookings / الحجوزات': r.bookingCount,
      'Total Pax / الركاب': r.totalPax,
      'Gross Revenue (EGP)': r.grossRevenue,
      'Discounts (EGP)': r.totalDiscount,
      'Net Revenue (EGP)': r.netRevenue,
      'Direct Costs (EGP)': r.directCosts,
      'Net Profit / صافي الربح (EGP)': r.netProfit,
      'Profit Margin %': `${r.marginPct}%`,
    }));

    exportRows.push({
      'Tour Type': 'TOTAL / الإجمالي',
      'نوع الرحلة': 'الإجمالي العام',
      'Duration / المدة': '-',
      'Bookings / الحجوزات': reportData.results.reduce((s, r) => s + r.bookingCount, 0),
      'Total Pax / الركاب': reportData.results.reduce((s, r) => s + r.totalPax, 0),
      'Gross Revenue (EGP)': reportData.results.reduce((s, r) => s + r.grossRevenue, 0),
      'Discounts (EGP)': reportData.results.reduce((s, r) => s + r.totalDiscount, 0),
      'Net Revenue (EGP)': reportData.totalRevenue,
      'Direct Costs (EGP)': reportData.totalCosts,
      'Net Profit / صافي الربح (EGP)': reportData.totalProfit,
      'Profit Margin %': `${reportData.overallMarginPct}%`,
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tour Profitability');
    XLSX.writeFile(wb, `DUCK_Tour_Profitability_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePreset = (preset: 'today' | 'this_month' | 'all') => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      setStartDate(`${year}-${month}-01`);
      setEndDate(todayStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#147d9f]" />
            <span>
              {lang === 'ar'
                ? 'داش بورد المعاملات وربحية أنواع الرحلات النيلية'
                : 'Transactions & Tour Profitability Dashboard'}
            </span>
          </h1>
          <p className="text-xs opacity-75">
            {lang === 'ar'
              ? 'تقرير تفصيلي لإجمالي الإيرادات، التكاليف المباشرة وصافي الأرباح لكل نوع من الرحلات مع البحث بالتاريخ'
              : 'Granular breakdown of net revenues, direct operating costs, and net margins for each Nile tour type.'}
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-sm transition-colors"
        >
          <Download className="w-4 h-4 text-[#0c1226]" />
          <span>{lang === 'ar' ? 'تصدير التقرير (Excel)' : 'Export Profitability (XLSX)'}</span>
        </button>
      </div>

      {/* Date Range Filter Bar */}
      <div className={`p-4 rounded-lg border flex flex-wrap items-center justify-between gap-4 text-xs ${
        theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800/80'
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold">
            <Calendar className="w-4 h-4 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'البحث في الفترات بالتاريخ:' : 'Date Period Filter:'}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="opacity-75">{lang === 'ar' ? 'من:' : 'From:'}</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`border rounded px-2.5 py-1 font-mono focus:outline-none focus:border-[#147d9f] ${
                theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="opacity-75">{lang === 'ar' ? 'إلى:' : 'To:'}</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`border rounded px-2.5 py-1 font-mono focus:outline-none focus:border-[#147d9f] ${
                theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}
            />
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handlePreset('today')}
            className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
              theme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
          >
            {lang === 'ar' ? 'اليوم' : 'Today'}
          </button>
          <button
            onClick={() => handlePreset('this_month')}
            className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
              theme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
          >
            {lang === 'ar' ? 'الشهر الحالي' : 'This Month'}
          </button>
          <button
            onClick={() => handlePreset('all')}
            className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
              theme === 'light'
                ? 'bg-[#147d9f] text-white border-[#147d9f]'
                : 'bg-[#147d9f] text-white border-[#147d9f]'
            }`}
          >
            {lang === 'ar' ? 'كافة الفترات' : 'All Time'}
          </button>
        </div>
      </div>

      {/* KPI Top Cards */}
      {reportData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg border ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800/80'
          }`}>
            <div className="text-xs opacity-75 mb-1">{lang === 'ar' ? 'إجمالي إيراد الرحلات' : 'Total Net Revenue'}</div>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#147d9f]">
              {formatMoney(reportData.totalRevenue)}
            </div>
            <div className="text-[11px] opacity-75 mt-1">
              {reportData.totalInvoicesCount} {lang === 'ar' ? 'معاملة مسجلة' : 'invoices processed'}
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800/80'
          }`}>
            <div className="text-xs opacity-75 mb-1">{lang === 'ar' ? 'التكاليف المباشرة (كباتن وضيافة)' : 'Direct Operating Costs'}</div>
            <div className="text-2xl font-bold font-mono tracking-tight text-red-500">
              -{formatMoney(reportData.totalCosts)}
            </div>
            <div className="text-[11px] opacity-75 mt-1">
              {lang === 'ar' ? 'عمولات كباتن ورسوم مزارات' : 'Captains & landing dock fees'}
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800/80'
          }`}>
            <div className="text-xs opacity-75 mb-1">{lang === 'ar' ? 'صافي أرباح الرحلات' : 'Net Tour Profit'}</div>
            <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatMoney(reportData.totalProfit)}
            </div>
            <div className="text-[11px] opacity-75 mt-1">
              {lang === 'ar' ? 'الأرباح المحققة بعد التكاليف' : 'Profit contribution'}
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800/80'
          }`}>
            <div className="text-xs opacity-75 mb-1">{lang === 'ar' ? 'متوسط هامش الربحية' : 'Overall Profit Margin'}</div>
            <div className="text-2xl font-bold font-mono tracking-tight text-amber-500">
              {reportData.overallMarginPct}%
            </div>
            <div className="text-[11px] opacity-75 mt-1">
              {lang === 'ar' ? 'نسبة الربح من إجمالي الإيراد' : 'High margin yield'}
            </div>
          </div>
        </div>
      )}

      {/* Tour Types Profitability Table */}
      {reportData && (
        <div className={`border rounded-lg overflow-hidden ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800/80'
        }`}>
          <div className={`p-4 border-b flex items-center justify-between ${
            theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#0c142b] border-slate-800/80'
          }`}>
            <div>
              <h2 className="text-sm font-bold tracking-wide">
                {lang === 'ar' ? 'جدول أرباح وتكاليف كل نوع من الرحلات' : 'Tour Types Profitability Matrix'}
              </h2>
              <p className="text-[11px] opacity-75">
                {lang === 'ar' ? 'تحليل رقمي شامل لربحية كل جولة نيلية' : 'Comprehensive revenue, cost, and profit performance'}
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#147d9f]">
              {reportData.results.length} {lang === 'ar' ? 'أنواع رحلات' : 'tour types'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`uppercase font-semibold border-b ${
                theme === 'light' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-900/80 text-slate-400 border-slate-800'
              }`}>
                <tr>
                  <th className="py-3 px-4">{lang === 'ar' ? 'نوع الرحلة النيلية' : 'Tour Type'}</th>
                  <th className="py-3 px-3 text-center">{lang === 'ar' ? 'المدة' : 'Duration'}</th>
                  <th className="py-3 px-3 text-center">{lang === 'ar' ? 'الحجوزات' : 'Bookings'}</th>
                  <th className="py-3 px-3 text-center">{lang === 'ar' ? 'الركاب (Pax)' : 'Pax'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'ar' ? 'إجمالي الإيراد' : 'Gross Rev.'}</th>
                  <th className="py-3 px-3 text-right">{lang === 'ar' ? 'الخصومات' : 'Discounts'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'ar' ? 'صافي الإيراد' : 'Net Revenue'}</th>
                  <th className="py-3 px-4 text-right text-red-500">{lang === 'ar' ? 'التكاليف المباشرة' : 'Direct Costs'}</th>
                  <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">{lang === 'ar' ? 'صافي الربح' : 'Net Profit'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'ar' ? 'هامش الربح' : 'Margin %'}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                theme === 'light' ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/40 text-slate-200'
              }`}>
                {reportData.results.map((r) => (
                  <tr key={r.id} className={theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-slate-900/40'}>
                    <td className="py-3 px-4 font-bold">
                      <div className="text-white dark:text-white font-bold">{lang === 'ar' ? r.tourTypeNameAr : r.tourTypeName}</div>
                      <div className="text-[11px] opacity-75">{lang === 'ar' ? r.tourTypeName : r.tourTypeNameAr}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono opacity-80">{r.duration}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold">{r.bookingCount}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-[#147d9f]">{r.totalPax}</td>
                    <td className="py-3 px-4 text-right font-mono font-medium">{formatMoney(r.grossRevenue)}</td>
                    <td className="py-3 px-3 text-right font-mono text-red-500">
                      {r.totalDiscount > 0 ? `-${formatMoney(r.totalDiscount)}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#147d9f]">{formatMoney(r.netRevenue)}</td>
                    <td className="py-3 px-4 text-right font-mono text-red-500 font-medium">-{formatMoney(r.directCosts)}</td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatMoney(r.netProfit)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 font-mono font-bold text-amber-500">
                        <span>{r.marginPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Grand Total Row */}
              <tfoot className={`font-bold border-t-2 text-xs ${
                theme === 'light' ? 'bg-slate-100 text-slate-900 border-slate-300' : 'bg-[#0c142b] text-white border-slate-700'
              }`}>
                <tr>
                  <td colSpan={2} className="py-3 px-4 uppercase text-[#147d9f] font-extrabold">
                    {lang === 'ar' ? 'الإجمالي العام لكافة الرحلات' : 'Total All Tour Types'}
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    {reportData.results.reduce((s, r) => s + r.bookingCount, 0)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-[#147d9f]">
                    {reportData.results.reduce((s, r) => s + r.totalPax, 0)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {formatMoney(reportData.results.reduce((s, r) => s + r.grossRevenue, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-red-500">
                    -{formatMoney(reportData.results.reduce((s, r) => s + r.totalDiscount, 0))}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-[#147d9f]">
                    {formatMoney(reportData.totalRevenue)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-red-500 font-extrabold">
                    -{formatMoney(reportData.totalCosts)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                    {formatMoney(reportData.totalProfit)}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-extrabold text-amber-500">
                    {reportData.overallMarginPct}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Operational Insights Card */}
      <div className={`p-5 rounded-lg border text-xs space-y-2 ${
        theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#0c142b] border-slate-800 text-slate-300'
      }`}>
        <div className="font-bold text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#fdfb45]" />
          <span>{lang === 'ar' ? 'مؤشرات كفاءة الأرباح والتشغيل النيلي' : 'Operational Yield Insights'}</span>
        </div>
        <p>
          {lang === 'ar'
            ? 'جولة الغروب الذهبي (Golden Sunset) ومغامرة غرب سهيل النوبية تحققان أعلى عائد إجمالي وهوامش ربح تتجاوز 73% نظراً لكثافة الركاب وسعر الخدمة العائلي المزدوج.'
            : 'Sunset tours and Gharb Soheil Nubian expeditions deliver the highest aggregate profit margins (>73%) due to higher group passenger density.'}
        </p>
      </div>
    </div>
  );
};
