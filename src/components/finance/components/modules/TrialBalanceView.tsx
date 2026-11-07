import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../auth';
import { useErp } from '../../context/ErpContext';
import { TrialBalanceItem } from '../../types/erp';
import { Scale, Download, CheckCircle2, AlertTriangle, Layers, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

export const TrialBalanceView: React.FC = () => {
  const { formatMoney, lang, setActiveModule } = useErp();

  const [data, setData] = useState<{
    rows: TrialBalanceItem[];
    totalOpeningDr: number;
    totalOpeningCr: number;
    totalPeriodDr: number;
    totalPeriodCr: number;
    totalClosingDr: number;
    totalClosingCr: number;
    isBalanced: boolean;
  }>({
    rows: [],
    totalOpeningDr: 0,
    totalOpeningCr: 0,
    totalPeriodDr: 0,
    totalPeriodCr: 0,
    totalClosingDr: 0,
    totalClosingCr: 0,
    isBalanced: true,
  });

  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [hideZeroBalances, setHideZeroBalances] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchTrialBalance = async (s = startDate, e = endDate) => {
    setLoading(true);
    try {
      let url = '/trial-balance';
      const params = new URLSearchParams();
      if (s) params.append('startDate', s);
      if (e) params.append('endDate', e);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await apiFetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch trial balance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialBalance();
  }, [startDate, endDate]);

  const handleExportExcel = () => {
    const exportRows = data.rows.map((r) => ({
      'Account Code': r.accountCode,
      'Account Name (En)': r.nameEn,
      'Account Name (Ar)': r.nameAr,
      'Account Type': r.type,
      'Opening Debit': r.openingDebit,
      'Opening Credit': r.openingCredit,
      'Period Debit': r.periodDebit,
      'Period Credit': r.periodCredit,
      'Closing Debit': r.closingDebit,
      'Closing Credit': r.closingCredit,
    }));

    exportRows.push({
      'Account Code': 'TOTAL',
      'Account Name (En)': 'GRAND TOTAL',
      'Account Name (Ar)': 'الإجمالي العام',
      'Account Type': '' as any,
      'Opening Debit': data.totalOpeningDr,
      'Opening Credit': data.totalOpeningCr,
      'Period Debit': data.totalPeriodDr,
      'Period Credit': data.totalPeriodCr,
      'Closing Debit': data.totalClosingDr,
      'Closing Credit': data.totalClosingCr,
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trial Balance');
    XLSX.writeFile(workbook, `DUCK_Trial_Balance_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredRows = data.rows.filter((r) => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (hideZeroBalances && r.periodDebit === 0 && r.periodCredit === 0 && r.closingDebit === 0 && r.closingCredit === 0) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'ميزان المراجعة بالأرصدة والمجاميع' : 'Official Trial Balance'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'ميزان المراجعة ذو الـ 8 أعمدة (أرصدة افتتاحية، مجاميع الحركات، وأرصدة ختامية) مستند للقيود المرحلة حصراً'
              : 'Complete 8-column trial balance (Opening, Movements, and Closing balances) compiled strictly from posted journals.'}
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-sm transition-colors"
        >
          <Download className="w-4 h-4 text-[#0c1226]" />
          <span>{lang === 'ar' ? 'تصدير إكسيل (Excel)' : 'Export Trial Balance (XLSX)'}</span>
        </button>
      </div>

      {/* Validation Equality Banner */}
      <div
        className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          data.isBalanced
            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
            : 'bg-red-950/40 border-red-800/80 text-red-300'
        }`}
      >
        <div className="flex items-center gap-3">
          {data.isBalanced ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
          <div>
            <div className="font-bold text-sm">
              {data.isBalanced
                ? lang === 'ar'
                  ? 'ميزان المراجعة متوازن محاسبياً بنسبة 100%'
                  : 'Trial Balance Mathematically Balanced (Debits = Credits)'
                : 'Warning: Trial balance has an inequality discrepancy'}
            </div>
            <div className="text-[11px] opacity-80">
              {lang === 'ar'
                ? `مجاميع حركات الفترة: مدين (${formatMoney(data.totalPeriodDr)}) = دائن (${formatMoney(data.totalPeriodCr)})`
                : `Period Movements: Total Debits (${formatMoney(data.totalPeriodDr)}) == Total Credits (${formatMoney(data.totalPeriodCr)})`}
            </div>
          </div>
        </div>

        <div className="font-mono text-sm font-bold bg-slate-900/80 px-3 py-1.5 rounded border border-slate-800">
          Diff: {(data.totalPeriodDr - data.totalPeriodCr).toFixed(2)} EGP
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-[#0a0f21] border border-slate-800/80 p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">{lang === 'ar' ? 'تصنيف الحسابات:' : 'Account Type:'}</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200"
            >
              <option value="all">{lang === 'ar' ? 'كافة أنواع الحسابات' : 'All Types'}</option>
              <option value="Asset">Assets (الأصول)</option>
              <option value="Liability">Liabilities (الالتزامات)</option>
              <option value="Equity">Equity (حقوق الملكية)</option>
              <option value="Revenue">Revenue (الإيرادات)</option>
              <option value="Expense">Expenses (المصروفات)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">{lang === 'ar' ? 'من:' : 'From:'}</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">{lang === 'ar' ? 'إلى:' : 'To:'}</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white text-xs"
            >
              {lang === 'ar' ? 'إلغاء الفلتر' : 'Clear Dates'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={hideZeroBalances}
              onChange={(e) => setHideZeroBalances(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-[#147d9f]"
            />
            <span>{lang === 'ar' ? 'إخفاء الحسابات الصفرية غير المتحركة' : 'Hide zero-balance dormant accounts'}</span>
          </label>
        </div>
      </div>

      {/* 8-Column Trial Balance Table */}
      <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c142b] text-slate-400 font-semibold border-b border-slate-800/80 text-[11px]">
              <tr>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-800/80">{lang === 'ar' ? 'الكود' : 'Code'}</th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-800/80">{lang === 'ar' ? 'اسم الحساب المحاسبي' : 'Account Name'}</th>
                <th rowSpan={2} className="py-2.5 px-2 border-r border-slate-800/80 text-center">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                <th colSpan={2} className="py-1.5 px-3 text-center border-r border-slate-800/80 bg-slate-900/40">
                  {lang === 'ar' ? 'الأرصدة الافتتاحية' : 'Opening Balances'}
                </th>
                <th colSpan={2} className="py-1.5 px-3 text-center border-r border-slate-800/80 bg-[#147d9f]/20">
                  {lang === 'ar' ? 'مجاميع حركات الفترة' : 'Period Movements'}
                </th>
                <th colSpan={2} className="py-1.5 px-3 text-center bg-slate-900/40">
                  {lang === 'ar' ? 'الأرصدة الختامية' : 'Closing Balances'}
                </th>
              </tr>
              <tr className="border-t border-slate-800/60 text-[10px]">
                <th className="py-1 px-3 text-right border-r border-slate-800/80">{lang === 'ar' ? 'مدين' : 'Debit'}</th>
                <th className="py-1 px-3 text-right border-r border-slate-800/80">{lang === 'ar' ? 'دائن' : 'Credit'}</th>
                <th className="py-1 px-3 text-right border-r border-slate-800/80 bg-[#147d9f]/10 text-white font-bold">{lang === 'ar' ? 'مدين' : 'Debit'}</th>
                <th className="py-1 px-3 text-right border-r border-slate-800/80 bg-[#147d9f]/10 text-white font-bold">{lang === 'ar' ? 'دائن' : 'Credit'}</th>
                <th className="py-1 px-3 text-right border-r border-slate-800/80 text-[#fdfb45] font-bold">{lang === 'ar' ? 'مدين' : 'Debit'}</th>
                <th className="py-1 px-3 text-right text-[#fdfb45] font-bold">{lang === 'ar' ? 'دائن' : 'Credit'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-200">
              {filteredRows.map((row) => (
                <tr key={row.accountCode} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-2 px-3 font-mono font-bold text-[#147d9f] border-r border-slate-800/40">
                    {row.accountCode}
                  </td>
                  <td className="py-2 px-3 font-medium text-white border-r border-slate-800/40">
                    {lang === 'ar' ? row.nameAr : row.nameEn}
                  </td>
                  <td className="py-2 px-2 text-center text-slate-400 text-[10px] border-r border-slate-800/40">
                    {row.type}
                  </td>
                  {/* Opening */}
                  <td className="py-2 px-3 text-right font-mono text-slate-400 border-r border-slate-800/40">
                    {row.openingDebit > 0 ? formatMoney(row.openingDebit) : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400 border-r border-slate-800/40">
                    {row.openingCredit > 0 ? formatMoney(row.openingCredit) : '-'}
                  </td>
                  {/* Period */}
                  <td className="py-2 px-3 text-right font-mono font-semibold text-white border-r border-slate-800/40 bg-slate-900/20">
                    {row.periodDebit > 0 ? formatMoney(row.periodDebit) : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-white border-r border-slate-800/40 bg-slate-900/20">
                    {row.periodCredit > 0 ? formatMoney(row.periodCredit) : '-'}
                  </td>
                  {/* Closing */}
                  <td className="py-2 px-3 text-right font-mono font-bold text-white border-r border-slate-800/40">
                    {row.closingDebit > 0 ? formatMoney(row.closingDebit) : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-white">
                    {row.closingCredit > 0 ? formatMoney(row.closingCredit) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Grand Totals */}
            <tfoot className="bg-[#0c142b] border-t-2 border-slate-700 font-bold text-xs text-white">
              <tr>
                <td colSpan={3} className="py-3 px-4 uppercase font-extrabold text-[#fdfb45]">
                  {lang === 'ar' ? 'الإجمالي العام للميزان (Grand Total)' : 'Grand Total'}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-300 border-r border-slate-800/80">
                  {formatMoney(data.totalOpeningDr)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-300 border-r border-slate-800/80">
                  {formatMoney(data.totalOpeningCr)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-white font-extrabold border-r border-slate-800/80 bg-[#147d9f]/20">
                  {formatMoney(data.totalPeriodDr)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-white font-extrabold border-r border-slate-800/80 bg-[#147d9f]/20">
                  {formatMoney(data.totalPeriodCr)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-[#fdfb45] font-extrabold border-r border-slate-800/80">
                  {formatMoney(data.totalClosingDr)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-[#fdfb45] font-extrabold">
                  {formatMoney(data.totalClosingCr)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
