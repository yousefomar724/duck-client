import React from 'react';
import { useErp } from '../../context/ErpContext';
import { Compass, MapPin, Ship, Layers, TrendingUp } from 'lucide-react';

export const CostCentersView: React.FC = () => {
  const { costCenters, invoices, expenses, formatMoney, lang, t } = useErp();

  // Location profitability data
  const locations = [
    {
      code: 'CC-ELPH',
      nameEn: 'Elephantine Island Station',
      nameAr: 'محطة جزيرة إلفنتين',
      revenue: 168000,
      directCost: 78000,
      margin: 90000,
      marginPct: 53.5,
    },
    {
      code: 'CC-SOHL',
      nameEn: 'Gharb Soheil Nubian Station',
      nameAr: 'محطة غرب سهيل النوبية',
      revenue: 95000,
      directCost: 46000,
      margin: 49000,
      marginPct: 51.5,
    },
    {
      code: 'CC-MAIN',
      nameEn: 'DUCK Main Operations HQ',
      nameAr: 'المقر الرئيسي وعمليات أسوان',
      revenue: 145000,
      directCost: 62000,
      margin: 83000,
      marginPct: 57.2,
    },
  ];

  // Activities profitability data
  const activities = [
    { name: 'Kayak Fleet (Single & Double)', code: 'CC-KYK', revenue: 148500, directCost: 52000, margin: 96500, marginPct: 65 },
    { name: 'SUP Paddleboards', code: 'CC-SUP', revenue: 82000, directCost: 28000, margin: 54000, marginPct: 65.8 },
    { name: 'Nile Water Bikes', code: 'CC-WBK', revenue: 94000, directCost: 34000, margin: 60000, marginPct: 63.8 },
    { name: 'Private Felucca & Boat Tours', code: 'CC-BOAT', revenue: 67500, directCost: 29000, margin: 38500, marginPct: 57.0 },
  ];

  return (
    <div className="space-y-6">
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
                <span className="text-xs font-bold text-emerald-400">{loc.marginPct}% Margin</span>
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
                    <td className="py-3 px-4 font-bold text-white">{act.name}</td>
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
    </div>
  );
};
