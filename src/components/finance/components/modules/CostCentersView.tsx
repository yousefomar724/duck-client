import React, { useEffect, useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { currentMonth, monthRange } from '../../utils/period';
import { Compass, MapPin, Ship, Layers, TrendingUp } from 'lucide-react';

export const CostCentersView: React.FC = () => {
  const { fetchCostCenterProfitability, journalEntries, formatMoney, lang, t } = useErp();

  // Revenue (41xx) and direct cost per cost center from posted journal lines in the selected month
  const [month, setMonth] = useState<string>(currentMonth());
  const [report, setReport] = useState<any>(null);
  const { start, end } = monthRange(month);

  useEffect(() => {
    let cancelled = false;
    fetchCostCenterProfitability(start, end)
      .then((data) => !cancelled && setReport(data))
      .catch((err) => {
        console.error('Error loading cost centers:', err);
        if (!cancelled) setReport(null);
      });
    return () => {
      cancelled = true;
    };
  }, [start, end, journalEntries]);

  const rows: any[] = report?.centers || [];
  const locations = rows.filter((c) => c.type === 'Location');
  const activities = rows.filter((c) => c.type === 'Activity');
  const unallocated = report?.unallocated;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
          <Compass className="w-5 h-5 text-[#147d9f]" />
          <span>{lang === 'ar' ? 'مراكز التكلفة والتحليل البعدي للأرباح' : 'Cost Centers & Dimensional Profitability'}</span>
        </h1>
        <p className="text-xs text-slate-400">
          {lang === 'ar'
            ? 'تحليل ربحية كل موقع تشغيلي في النيل وكل نشاط رياضي دون تكرار حسابات الدليل'
            : 'Multidimensional profitability across Nile docks, activities, and tour captains without account duplication.'}
        </p>
      </div>
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          aria-label={lang === 'ar' ? 'الفترة' : 'Period'}
          className="self-start px-2.5 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 text-slate-200 rounded focus:outline-none focus:border-[#147d9f]"
        />
      </div>

      {/* Location Profitability */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#fdfb45]" />
          <span>{lang === 'ar' ? 'ربحية المحطات والمواقع النيلية' : 'Profitability by Nile Dock & Station'}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <div key={loc.code} className="bg-[#0a0f21] border border-slate-800/80 p-5 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#147d9f]">{loc.code}</span>
                <span className="text-xs font-bold text-emerald-400">{loc.marginPct}% {lang === 'ar' ? 'هامش' : 'Margin'}</span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-white">{lang === 'ar' ? loc.nameAr : loc.nameEn}</h3>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>{lang === 'ar' ? 'الإيرادات:' : 'Revenue:'}</span>
                  <span className="font-mono text-slate-200">{formatMoney(loc.revenue)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{lang === 'ar' ? 'التكاليف المباشرة:' : 'Direct Costs:'}</span>
                  <span className="font-mono text-red-400">-{formatMoney(loc.directCost)}</span>
                </div>
                <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800/60">
                  <span>{lang === 'ar' ? 'هامش المساهمة:' : 'Contribution Margin:'}</span>
                  <span className="font-mono text-[#fdfb45]">{formatMoney(loc.margin)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activities Profitability */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Ship className="w-4 h-4 text-[#147d9f]" />
          <span>{lang === 'ar' ? 'ربحية الأنشطة والرياضات المائية' : 'Profitability by Nile Water Sport Activity'}</span>
        </h2>

        <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c142b] text-slate-400 uppercase font-semibold border-b border-slate-800/80">
                <tr>
                  <th className="py-3 px-4">{lang === 'ar' ? 'النشاط والمعدة' : 'Activity / Sport'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'مركز التكلفة' : 'Cost Center'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'ar' ? 'الإيرادات' : 'Revenue'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'ar' ? 'التكاليف المباشرة' : 'Direct Costs'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'ar' ? 'صافي هامش الربح' : 'Contribution Margin'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'ar' ? 'نسبة الهامش' : 'Margin %'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-200">
                {activities.map((act) => (
                  <tr key={act.code} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{lang === 'ar' ? act.nameAr : act.nameEn}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-[#147d9f]">{act.code}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-white">{formatMoney(act.revenue)}</td>
                    <td className="py-3 px-4 text-right font-mono text-red-400">-{formatMoney(act.directCost)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#fdfb45]">{formatMoney(act.margin)}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">{act.marginPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {unallocated && (unallocated.revenue !== 0 || unallocated.directCost !== 0) && (
        <p className="text-[11px] text-slate-400">
          {lang === 'ar' ? 'غير موزع على مركز تكلفة:' : 'Not assigned to a cost center:'}{' '}
          <span className="font-mono">
            {lang === 'ar' ? 'الإيرادات' : 'Revenue'} {formatMoney(unallocated.revenue)} · {lang === 'ar' ? 'التكاليف المباشرة' : 'Direct costs'} {formatMoney(unallocated.directCost)}
          </span>
        </p>
      )}
    </div>
  );
};
