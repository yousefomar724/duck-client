import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { Sliders, Lock, Unlock, CheckCircle2, ShieldCheck, Users, Calendar, Ship } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { periods, lockPeriod, unlockPeriod, settings, lang, t } = useErp();

  const [activeTab, setActiveTab] = useState<'periods' | 'lists'>('periods');

  const handleToggleLock = async (p: any) => {
    try {
      if (p.status === 'Locked' || p.status === 'Closed') {
        await unlockPeriod(p.id);
      } else {
        await lockPeriod(p.id);
      }
    } catch (err: any) {
      alert(`Period action error: ${err?.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'إعدادات النظام وإقفال الفترات المالية' : 'System Settings & Period Closing'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'إقفال الشهور المالية لمنع التعديلات الرجعية، وإدارة قوائم الكباتن والخدمات والأنشطة'
              : 'Control monthly fiscal locks, prevent retroactive tampering, and configure operational lists.'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('periods')}
          className={`px-3.5 py-1.5 font-semibold rounded transition-colors ${
            activeTab === 'periods'
              ? 'bg-[#147d9f] text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {lang === 'ar' ? 'الفترات المالية والإقفال المحاسبي' : 'Accounting Periods & Lock'}
        </button>
        <button
          onClick={() => setActiveTab('lists')}
          className={`px-3.5 py-1.5 font-semibold rounded transition-colors ${
            activeTab === 'lists'
              ? 'bg-[#147d9f] text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {lang === 'ar' ? 'قوائم الكباتن والخدمات والأنشطة' : 'Configurable Lists & Services'}
        </button>
      </div>

      {/* TAB 1: ACCOUNTING PERIODS & LOCKING */}
      {activeTab === 'periods' && (
        <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {lang === 'ar' ? 'حالة الفترات المالية للسنة الحالية' : 'Fiscal Year 2026 Monthly Periods'}
            </span>
            <span className="text-[11px] text-slate-400">
              {lang === 'ar'
                ? 'الفترة المقفلة تمنع بشكل قاطع أي ترحيل لقيود جديدة أو تعديل فواتير سابقة'
                : 'Locked periods strictly reject incoming journal entries or invoice revisions.'}
            </span>
          </div>

          <div className="border border-slate-800 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c142b] text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">{lang === 'ar' ? 'الفترة المحاسبية' : 'Period'}</th>
                  <th className="py-2.5 px-4">{lang === 'ar' ? 'تاريخ البداية' : 'Start Date'}</th>
                  <th className="py-2.5 px-4">{lang === 'ar' ? 'تاريخ النهاية' : 'End Date'}</th>
                  <th className="py-2.5 px-4 text-center">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="py-2.5 px-4">{lang === 'ar' ? 'تاريخ ومسؤول الإقفال' : 'Closed By'}</th>
                  <th className="py-2.5 px-4 text-center">{lang === 'ar' ? 'التحكم' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {periods.map((p) => {
                  const isLocked = p.status === 'Locked' || p.status === 'Closed';
                  return (
                    <tr key={p.id} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-4 font-bold text-white">{p.name}</td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono">{p.startDate}</td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono">{p.endDate}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`text-[11px] font-bold ${
                            isLocked ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {p.closedBy ? `${p.closedBy} (${p.closedAt?.split('T')[0]})` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleLock(p)}
                          className={`px-3 py-1 text-[11px] font-semibold rounded flex items-center gap-1 mx-auto transition-colors ${
                            isLocked
                              ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                              : 'bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800'
                          }`}
                        >
                          {isLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          <span>{isLocked ? (lang === 'ar' ? 'إعادة الفتح' : 'Unlock Period') : (lang === 'ar' ? 'إقفال نهائي' : 'Lock Period')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CONFIGURABLE LISTS */}
      {activeTab === 'lists' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Captains */}
          <div className="bg-[#0a0f21] border border-slate-800/80 p-5 rounded-lg space-y-3">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#147d9f]" />
              <span>{lang === 'ar' ? 'قائمة الكباتن المعتمدين' : 'Authorized Nile Captains'}</span>
            </h3>
            <div className="space-y-1.5 divide-y divide-slate-800/60">
              {settings.captains?.map((c: any) => (
                <div key={c.id} className="pt-2 flex justify-between items-center text-slate-300">
                  <span className="font-semibold text-white">{c.name}</span>
                  <span className="font-mono text-slate-400">{c.phone} · Comm: {c.commissionRate}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Nile Services */}
          <div className="bg-[#0a0f21] border border-slate-800/80 p-5 rounded-lg space-y-3">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Ship className="w-4 h-4 text-[#fdfb45]" />
              <span>{lang === 'ar' ? 'قائمة الخدمات والأسعار الافتراضية' : 'Nile Tour Services & Standard Rates'}</span>
            </h3>
            <div className="space-y-1.5 divide-y divide-slate-800/60">
              {settings.services?.map((s: any) => (
                <div key={s.id} className="pt-2 flex justify-between items-center text-slate-300">
                  <div>
                    <div className="font-semibold text-white">{s.nameEn}</div>
                    <div className="text-[10px] text-slate-400">{s.nameAr}</div>
                  </div>
                  <span className="font-mono text-[#fdfb45] font-bold">{s.defaultPrice} EGP</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
