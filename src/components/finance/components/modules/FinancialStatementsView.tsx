import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../auth';
import { useErp } from '../../context/ErpContext';
import { FinancialStatementIncome, FinancialStatementBalanceSheet } from '../../types/erp';
import { LineChart, CheckCircle2, AlertTriangle, FileText, Download, Scale, ArrowUpRight } from 'lucide-react';

export const FinancialStatementsView: React.FC = () => {
  const { formatMoney, lang, t } = useErp();

  const [activeTab, setActiveTab] = useState<'income' | 'balance' | 'cashflow' | 'equity'>('income');
  const [data, setData] = useState<{
    incomeStatement: FinancialStatementIncome;
    balanceSheet: FinancialStatementBalanceSheet;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatements = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/financial-statements');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch financial statements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatements();
  }, []);

  if (!data) {
    return <div className="p-8 text-center text-slate-400">Loading Financial Statements...</div>;
  }

  const { incomeStatement, balanceSheet } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <LineChart className="w-5 h-5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'القوائم والتقارير المالية الختامية' : 'Official Financial Statements'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'قائمة الدخل، الميزانية العمومية، التدفقات النقدية والتغير في حقوق الملكية مستخرجة آلياً'
              : 'Income Statement (P&L), Balance Sheet (Assets = Liab + Equity), Cash Flows, and Equity Statement.'}
          </p>
        </div>

        {/* Balance Sheet Verification Status */}
        <div
          className={`px-3 py-1.5 rounded border text-xs flex items-center gap-2 font-mono font-bold ${
            balanceSheet.isBalanced
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
              : 'bg-red-950/60 border-red-800 text-red-400'
          }`}
        >
          {balanceSheet.isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>
            {balanceSheet.isBalanced
              ? lang === 'ar'
                ? 'الميزانية متوازنة: الأصول = الالتزامات + الملكية'
                : 'Balance Sheet Integrity Verified: Assets = Liab + Equity'
              : `Discrepancy: ${balanceSheet.difference.toFixed(2)} EGP`}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        {[
          { id: 'income', labelEn: 'Income Statement (P&L)', labelAr: 'قائمة الدخل (الأرباح والخسائر)' },
          { id: 'balance', labelEn: 'Balance Sheet', labelAr: 'الميزانية العمومية (المركز المالي)' },
          { id: 'cashflow', labelEn: 'Cash Flow Statement', labelAr: 'قائمة التدفقات النقدية' },
          { id: 'equity', labelEn: 'Statement of Changes in Equity', labelAr: 'قائمة التغير في حقوق الملكية' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 font-semibold rounded transition-colors ${
              activeTab === tab.id
                ? 'bg-[#147d9f] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {lang === 'ar' ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* TAB 1: INCOME STATEMENT */}
      {activeTab === 'income' && (
        <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg p-6 space-y-6 max-w-4xl mx-auto">
          <div className="text-center pb-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              DUCK Nile Water Sports & Tourism
            </h2>
            <div className="text-sm font-semibold text-[#147d9f] mt-0.5">
              {lang === 'ar' ? 'قائمة الدخل التشغيلي والمالي' : 'Statement of Profit or Loss (Income Statement)'}
            </div>
            <div className="text-xs text-slate-400 mt-1">For Period Ended November 2026 · Currency: EGP</div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Revenue Section */}
            <div className="space-y-1">
              <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-800">
                1. {lang === 'ar' ? 'الإيرادات والأنشطة النيلية' : 'Operating Revenue'}
              </div>
              {incomeStatement.revenue.map((item) => (
                <div key={item.code} className="flex justify-between py-1 px-2 text-slate-300">
                  <span>{item.code} - {lang === 'ar' ? item.nameAr : item.nameEn}</span>
                  <span className="font-mono">{formatMoney(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 px-2 font-bold text-white bg-slate-900/60 rounded">
                <span>{lang === 'ar' ? 'إجمالي الإيرادات التشغيلية' : 'Total Revenue'}</span>
                <span className="font-mono text-emerald-400">{formatMoney(incomeStatement.totalRevenue)}</span>
              </div>
            </div>

            {/* Cost of Revenue */}
            <div className="space-y-1">
              <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-800">
                2. {lang === 'ar' ? 'تكاليف التشغيل المباشرة' : 'Cost of Revenue (Direct Nile Operations)'}
              </div>
              {incomeStatement.costOfRevenue.map((item) => (
                <div key={item.code} className="flex justify-between py-1 px-2 text-slate-300">
                  <span>{item.code} - {lang === 'ar' ? item.nameAr : item.nameEn}</span>
                  <span className="font-mono text-slate-400">{formatMoney(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 px-2 font-bold text-white bg-slate-900/60 rounded">
                <span>{lang === 'ar' ? 'إجمالي تكاليف التشغيل المباشرة' : 'Total Cost of Revenue'}</span>
                <span className="font-mono text-red-400">-{formatMoney(incomeStatement.totalCostOfRevenue)}</span>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between p-3 bg-slate-900 rounded border border-slate-800 font-bold text-sm text-white">
              <span>{lang === 'ar' ? 'مجمل الربح (Gross Profit)' : 'Gross Profit'}</span>
              <span className="font-mono text-[#fdfb45]">{formatMoney(incomeStatement.grossProfit)}</span>
            </div>

            {/* Operating Expenses */}
            <div className="space-y-1">
              <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-800">
                3. {lang === 'ar' ? 'المصروفات التشغيلية والعمومية والتسويقية' : 'Operating, Admin & Marketing Expenses'}
              </div>
              {incomeStatement.operatingExpenses.map((item) => (
                <div key={item.code} className="flex justify-between py-1 px-2 text-slate-300">
                  <span>{item.code} - {lang === 'ar' ? item.nameAr : item.nameEn}</span>
                  <span className="font-mono text-slate-400">{formatMoney(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 px-2 font-bold text-white bg-slate-900/60 rounded">
                <span>{lang === 'ar' ? 'إجمالي المصروفات التشغيلية' : 'Total Operating Expenses'}</span>
                <span className="font-mono text-red-400">-{formatMoney(incomeStatement.totalOperatingExpenses)}</span>
              </div>
            </div>

            {/* Net Operating Profit */}
            <div className="flex justify-between p-4 bg-gradient-to-r from-[#0c142b] to-[#147d9f]/20 rounded-lg border-2 border-[#147d9f] font-black text-base text-white">
              <span>{lang === 'ar' ? 'صافي الربح / (الخسارة) للفترة' : 'Net Profit for the Period'}</span>
              <span className="font-mono text-[#fdfb45]">{formatMoney(incomeStatement.netProfit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BALANCE SHEET */}
      {activeTab === 'balance' && (
        <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg p-6 space-y-6 max-w-4xl mx-auto">
          <div className="text-center pb-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              DUCK Nile Water Sports & Tourism
            </h2>
            <div className="text-sm font-semibold text-[#147d9f] mt-0.5">
              {lang === 'ar' ? 'الميزانية العمومية وقائمة المركز المالي' : 'Statement of Financial Position (Balance Sheet)'}
            </div>
            <div className="text-xs text-slate-400 mt-1">As of November 2026 · Currency: EGP</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* ASSETS COLUMN */}
            <div className="space-y-4">
              <div className="text-sm font-bold text-white border-b border-slate-700 pb-1.5 uppercase tracking-wide">
                {lang === 'ar' ? 'الأصول (Assets)' : 'Assets'}
              </div>

              {/* Current Assets */}
              <div className="space-y-1">
                <div className="font-bold text-slate-300 text-[11px]">{lang === 'ar' ? 'الأصول المتداولة:' : 'Current Assets:'}</div>
                {balanceSheet.currentAssets.map((item) => (
                  <div key={item.code} className="flex justify-between py-1 px-2 text-slate-300">
                    <span>{item.code} - {lang === 'ar' ? item.nameAr : item.nameEn}</span>
                    <span className="font-mono">{formatMoney(item.amount)}</span>
                  </div>
                ))}
              </div>

              {/* Fixed Assets */}
              <div className="space-y-1 pt-2">
                <div className="font-bold text-slate-300 text-[11px]">{lang === 'ar' ? 'الأصول الثابتة والمعدات النيلية:' : 'Fixed Assets & Nile Fleet:'}</div>
                {balanceSheet.fixedAssets.map((item) => (
                  <div key={item.code} className="flex justify-between py-1 px-2 text-slate-300">
                    <span>{item.code} - {lang === 'ar' ? item.nameAr : item.nameEn}</span>
                    <span className="font-mono">{formatMoney(item.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between p-3 bg-slate-900 rounded border border-slate-800 font-bold text-white text-sm">
                <span>{lang === 'ar' ? 'إجمالي الأصول' : 'Total Assets'}</span>
                <span className="font-mono text-emerald-400">{formatMoney(balanceSheet.totalAssets)}</span>
              </div>
            </div>

            {/* LIABILITIES & EQUITY COLUMN */}
            <div className="space-y-4">
              <div className="text-sm font-bold text-white border-b border-slate-700 pb-1.5 uppercase tracking-wide">
                {lang === 'ar' ? 'الالتزامات وحقوق الملكية' : 'Liabilities & Equity'}
              </div>

              {/* Current Liabilities */}
              <div className="space-y-1">
                <div className="font-bold text-slate-300 text-[11px]">{lang === 'ar' ? 'الالتزامات المتداولة:' : 'Current Liabilities:'}</div>
                {balanceSheet.currentLiabilities.map((item) => (
                  <div key={item.code} className="flex justify-between py-1 px-2 text-slate-300">
                    <span>{item.code} - {lang === 'ar' ? item.nameAr : item.nameEn}</span>
                    <span className="font-mono">{formatMoney(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1 px-2 font-semibold text-slate-200">
                  <span>{lang === 'ar' ? 'إجمالي الالتزامات' : 'Total Liabilities'}</span>
                  <span className="font-mono">{formatMoney(balanceSheet.totalLiabilities)}</span>
                </div>
              </div>

              {/* Equity */}
              <div className="space-y-1 pt-2">
                <div className="font-bold text-slate-300 text-[11px]">{lang === 'ar' ? 'حقوق الملكية ورأس المال:' : 'Shareholders Equity:'}</div>
                {balanceSheet.equity.map((item) => (
                  <div key={item.code} className="flex justify-between py-1 px-2 text-slate-300">
                    <span>{item.code} - {lang === 'ar' ? item.nameAr : item.nameEn}</span>
                    <span className="font-mono">{formatMoney(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1 px-2 text-slate-300">
                  <span>{lang === 'ar' ? 'صافي أرباح الفترة الحالية' : 'Current Period Net Profit'}</span>
                  <span className="font-mono text-[#fdfb45]">{formatMoney(balanceSheet.currentPeriodProfit)}</span>
                </div>
                <div className="flex justify-between py-1 px-2 font-semibold text-slate-200">
                  <span>{lang === 'ar' ? 'إجمالي حقوق الملكية' : 'Total Equity'}</span>
                  <span className="font-mono">{formatMoney(balanceSheet.totalEquity)}</span>
                </div>
              </div>

              <div className="flex justify-between p-3 bg-slate-900 rounded border border-slate-800 font-bold text-white text-sm">
                <span>{lang === 'ar' ? 'إجمالي الالتزامات وحقوق الملكية' : 'Total Liabilities & Equity'}</span>
                <span className="font-mono text-emerald-400">{formatMoney(balanceSheet.totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CASH FLOW STATEMENT */}
      {activeTab === 'cashflow' && (
        <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg p-6 space-y-4 max-w-4xl mx-auto text-xs">
          <div className="text-center pb-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              DUCK Nile Water Sports & Tourism
            </h2>
            <div className="text-sm font-semibold text-[#147d9f] mt-0.5">
              {lang === 'ar' ? 'قائمة التدفقات النقدية (Cash Flow Statement)' : 'Statement of Cash Flows'}
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-900/60 rounded border border-slate-800 space-y-1">
              <div className="font-bold text-slate-200">{lang === 'ar' ? '1. التدفقات النقدية من الأنشطة التشغيلية' : '1. Operating Activities'}</div>
              <div className="flex justify-between text-slate-300">
                <span>{lang === 'ar' ? 'النقدية المحصلة من رحلات وحجوزات النيل' : 'Customer tour collections'}</span>
                <span className="font-mono text-emerald-400">+{formatMoney(incomeStatement.totalRevenue * 0.9)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>{lang === 'ar' ? 'المدفوعات للكباتن والموردين والمصروفات' : 'Cash paid to captains & suppliers'}</span>
                <span className="font-mono text-red-400">-{formatMoney(incomeStatement.totalCostOfRevenue + incomeStatement.totalOperatingExpenses * 0.8)}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded border border-slate-800 space-y-1">
              <div className="font-bold text-slate-200">{lang === 'ar' ? '2. التدفقات النقدية من الأنشطة الاستثمارية' : '2. Investing Activities'}</div>
              <div className="flex justify-between text-slate-300">
                <span>{lang === 'ar' ? 'شراء قوارب كاياك ومعدات أمان جديدة' : 'Acquisition of Nile kayaks & equipment'}</span>
                <span className="font-mono text-red-400">-{formatMoney(10000)}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded border border-slate-800 space-y-1">
              <div className="font-bold text-slate-200">{lang === 'ar' ? '3. التدفقات النقدية من الأنشطة التمويلية' : '3. Financing Activities'}</div>
              <div className="flex justify-between text-slate-300">
                <span>{lang === 'ar' ? 'مساهمات رأس المال ومسحوبات الشركاء' : 'Capital contributions & drawings'}</span>
                <span className="font-mono">0.00 EGP</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CHANGES IN EQUITY */}
      {activeTab === 'equity' && (
        <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg p-6 space-y-4 max-w-4xl mx-auto text-xs">
          <div className="text-center pb-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              DUCK Nile Water Sports & Tourism
            </h2>
            <div className="text-sm font-semibold text-[#147d9f] mt-0.5">
              {lang === 'ar' ? 'قائمة التغير في حقوق الملكية' : 'Statement of Changes in Equity'}
            </div>
          </div>

          <table className="w-full text-left">
            <thead className="bg-[#0c142b] text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-2.5">{lang === 'ar' ? 'البيان' : 'Particulars'}</th>
                <th className="p-2.5 text-right">{lang === 'ar' ? 'رأس المال' : 'Share Capital'}</th>
                <th className="p-2.5 text-right">{lang === 'ar' ? 'الأرباح المرحلة' : 'Retained Earnings'}</th>
                <th className="p-2.5 text-right">{lang === 'ar' ? 'أرباح الفترة' : 'Current Profit'}</th>
                <th className="p-2.5 text-right">{lang === 'ar' ? 'الإجمالي' : 'Total Equity'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              <tr>
                <td className="p-2.5 font-medium">{lang === 'ar' ? 'الرصيد في أول الفترة' : 'Beginning Balance'}</td>
                <td className="p-2.5 text-right font-mono">{formatMoney(350000)}</td>
                <td className="p-2.5 text-right font-mono">{formatMoney(115000)}</td>
                <td className="p-2.5 text-right font-mono">-</td>
                <td className="p-2.5 text-right font-mono font-bold">{formatMoney(465000)}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-emerald-400">{lang === 'ar' ? 'صافي أرباح الفترة الحالية' : 'Current Period Net Profit'}</td>
                <td className="p-2.5 text-right font-mono">-</td>
                <td className="p-2.5 text-right font-mono">-</td>
                <td className="p-2.5 text-right font-mono text-[#fdfb45]">{formatMoney(incomeStatement.netProfit)}</td>
                <td className="p-2.5 text-right font-mono font-bold text-[#fdfb45]">{formatMoney(incomeStatement.netProfit)}</td>
              </tr>
              <tr className="bg-slate-900/60 font-bold border-t-2 border-slate-700">
                <td className="p-2.5 text-white">{lang === 'ar' ? 'الرصيد في نهاية الفترة' : 'Ending Total Equity'}</td>
                <td className="p-2.5 text-right font-mono">{formatMoney(350000)}</td>
                <td className="p-2.5 text-right font-mono">{formatMoney(115000)}</td>
                <td className="p-2.5 text-right font-mono">{formatMoney(incomeStatement.netProfit)}</td>
                <td className="p-2.5 text-right font-mono text-emerald-400 font-extrabold">
                  {formatMoney(350000 + 115000 + incomeStatement.netProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
