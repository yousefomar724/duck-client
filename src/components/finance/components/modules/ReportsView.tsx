import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { FileSpreadsheet, Clock, AlertCircle, DollarSign, Calendar } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { customers, suppliers, invoices, formatMoney, lang, t } = useErp();

  const [activeReport, setActiveReport] = useState<'ar_aging' | 'ap_aging' | 'tax'>('ar_aging');

  // Customer Aging buckets
  const arAging = customers.map((c) => ({
    name: c.name,
    total: c.outstandingBalance,
    current: Math.round(c.outstandingBalance * 0.7),
    days30: Math.round(c.outstandingBalance * 0.2),
    days60: Math.round(c.outstandingBalance * 0.1),
    days90Plus: 0,
  }));

  // Supplier Aging buckets
  const apAging = suppliers.map((s) => ({
    name: s.name,
    total: s.balance,
    current: Math.round(s.balance * 0.8),
    days30: Math.round(s.balance * 0.2),
    days60: 0,
    days90Plus: 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'التقارير المحاسبية التحليلية' : 'Accounting & Aging Reports'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'أعمار الديون والذمم المدينة، مستحقات الموردين، وإقرارات ضريبة القيمة المضافة'
              : 'Accounts Receivable Aging, Accounts Payable Aging, and Value-Added Tax compliance.'}
          </p>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        {[
          { id: 'ar_aging', labelEn: 'Accounts Receivable Aging', labelAr: 'أعمار ديون العملاء (AR Aging)' },
          { id: 'ap_aging', labelEn: 'Accounts Payable Aging', labelAr: 'أعمار مستحقات الموردين (AP Aging)' },
          { id: 'tax', labelEn: 'VAT / Tax Summary', labelAr: 'تقرير ضريبة القيمة المضافة' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id as any)}
            className={`px-3.5 py-1.5 font-semibold rounded transition-colors ${
              activeReport === tab.id
                ? 'bg-[#147d9f] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {lang === 'ar' ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* AR AGING REPORT */}
      {activeReport === 'ar_aging' && (
        <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="font-bold text-xs text-white uppercase tracking-wider">
              {lang === 'ar' ? 'جدول أعمار الذمم المدينة للعملاء' : 'Customer Receivables Aging Schedule'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c142b] text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">{lang === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'ar' ? 'إجمالي الرصيد' : 'Total Due'}</th>
                  <th className="py-2.5 px-3 text-right text-emerald-400">{lang === 'ar' ? 'جاري (0-30 يوم)' : 'Current (0-30d)'}</th>
                  <th className="py-2.5 px-3 text-right text-amber-400">{lang === 'ar' ? '31-60 يوم' : '31-60 Days'}</th>
                  <th className="py-2.5 px-3 text-right text-orange-400">{lang === 'ar' ? '61-90 يوم' : '61-90 Days'}</th>
                  <th className="py-2.5 px-3 text-right text-red-400">{lang === 'ar' ? '+90 يوم' : '90+ Days'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {arAging.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-4 font-bold text-white">{row.name}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">{formatMoney(row.total)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400">{formatMoney(row.current)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-400">{formatMoney(row.days30)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-orange-400">{formatMoney(row.days60)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-red-400">{formatMoney(row.days90Plus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AP AGING REPORT */}
      {activeReport === 'ap_aging' && (
        <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="font-bold text-xs text-white uppercase tracking-wider">
              {lang === 'ar' ? 'جدول أعمار الذمم الدائنة للموردين' : 'Accounts Payable Aging Schedule'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c142b] text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">{lang === 'ar' ? 'المورد' : 'Supplier'}</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'ar' ? 'إجمالي المستحق' : 'Total Payable'}</th>
                  <th className="py-2.5 px-3 text-right text-emerald-400">{lang === 'ar' ? 'جاري (0-30 يوم)' : 'Current (0-30d)'}</th>
                  <th className="py-2.5 px-3 text-right text-amber-400">{lang === 'ar' ? '31-60 يوم' : '31-60 Days'}</th>
                  <th className="py-2.5 px-3 text-right text-orange-400">{lang === 'ar' ? '61-90 يوم' : '61-90 Days'}</th>
                  <th className="py-2.5 px-3 text-right text-red-400">{lang === 'ar' ? '+90 يوم' : '90+ Days'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {apAging.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-4 font-bold text-white">{row.name}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-red-400">{formatMoney(row.total)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400">{formatMoney(row.current)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-400">{formatMoney(row.days30)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-orange-400">{formatMoney(row.days60)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-red-400">{formatMoney(row.days90Plus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAX REPORT */}
      {activeReport === 'tax' && (
        <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg p-6 space-y-4 max-w-2xl text-xs">
          <h2 className="font-bold text-sm text-white">{lang === 'ar' ? 'ملخص ضريبة القيمة المضافة (VAT 14%)' : 'Value Added Tax (VAT 14%) Summary'}</h2>

          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-slate-900/60 rounded border border-slate-800">
              <span className="text-slate-400">{lang === 'ar' ? 'ضريبة المخرجات المحصلة على الفواتير (Output VAT):' : 'Output VAT from Sales Invoices:'}</span>
              <span className="font-mono font-bold text-emerald-400">{formatMoney(8400)}</span>
            </div>

            <div className="flex justify-between p-3 bg-slate-900/60 rounded border border-slate-800">
              <span className="text-slate-400">{lang === 'ar' ? 'ضريبة المدخلات المخصومة على المشتريات (Input VAT):' : 'Input VAT on Purchases & Gear:'}</span>
              <span className="font-mono font-bold text-slate-300">-{formatMoney(3200)}</span>
            </div>

            <div className="flex justify-between p-4 bg-slate-900 rounded border border-slate-700 font-bold text-sm text-white">
              <span>{lang === 'ar' ? 'صافي الضريبة واجبة السداد لمصلحة الضرائب:' : 'Net VAT Payable to ETA:'}</span>
              <span className="font-mono text-[#fdfb45]">{formatMoney(5200)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
