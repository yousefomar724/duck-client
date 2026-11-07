import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { BadgePercent, Plus, CheckCircle2, DollarSign, Calculator, Ship } from 'lucide-react';

export const ProviderSettlementsView: React.FC = () => {
  const { settings, formatMoney, lang, t } = useErp();

  const [settlements, setSettlements] = useState([
    {
      id: 'set-1',
      settlementNumber: 'SET-2026-001',
      providerName: 'Captain Hamada Fleet Services',
      period: 'Oct 2026',
      totalTrips: 18,
      grossRevenue: 28000,
      commissionRate: 15,
      commissionAmount: 4200,
      advancesDeducted: 1000,
      netPayable: 3200,
      status: 'paid',
    },
    {
      id: 'set-2',
      settlementNumber: 'SET-2026-002',
      providerName: 'Nubian Dream Guest House (Gharb Soheil)',
      period: 'Oct 2026',
      totalTrips: 12,
      grossRevenue: 15600,
      commissionRate: 20,
      commissionAmount: 3120,
      advancesDeducted: 500,
      netPayable: 2620,
      status: 'approved',
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <BadgePercent className="w-5 h-5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'تسويات الكباتن ومقدمي الخدمات والبيوت النوبية' : 'Provider & Captain Settlements'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'احتساب عمولات رحلات النيل، خصم السلف والدفعات المقدمة، وتوليد أوامر الصرف المعتمدة'
              : 'Calculate captain tour commissions, deduct advances, and enforce principal-vs-agent accounting treatments.'}
          </p>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c142b] text-slate-400 uppercase font-semibold border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-4">{lang === 'ar' ? 'رقم التسوية' : 'Settlement #'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'المقدم / الكابتن' : 'Provider / Captain'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'الفترة' : 'Period'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'الرحلات' : 'Trips'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'إجمالي إيراد الرحلات' : 'Gross Revenue'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'العمولة' : 'Commission'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'السلف المخصومة' : 'Advances Deducted'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'صافي المستحق' : 'Net Payable'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-200">
              {settlements.map((s) => (
                <tr key={s.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#147d9f]">{s.settlementNumber}</td>
                  <td className="py-3 px-4 font-bold text-white">{s.providerName}</td>
                  <td className="py-3 px-4 text-center text-slate-400 font-mono">{s.period}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-white">{s.totalTrips}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-white">{formatMoney(s.grossRevenue)}</td>
                  <td className="py-3 px-4 text-right font-mono text-[#fdfb45] font-semibold">{formatMoney(s.commissionAmount)} ({s.commissionRate}%)</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-400">-{formatMoney(s.advancesDeducted)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                    {formatMoney(s.netPayable)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase">
                      {s.status}
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
