import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { currentMonth, monthRange } from '../../utils/period';
import { BadgePercent, Plus } from 'lucide-react';

const inputCls =
  'bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#147d9f]';

export const ProviderSettlementsView: React.FC = () => {
  const {
    settings,
    accounts,
    providerSettlements,
    currentUser,
    createProviderSettlement,
    approveProviderSettlement,
    payProviderSettlement,
    formatMoney,
    lang,
  } = useErp();

  const permissions: string[] = (currentUser as any)?.permissions || [];
  const can = (p: string) => permissions.includes('*') || permissions.includes(p);
  const captains: any[] = (settings?.captains || []).filter((c: any) => c.active !== false);
  const cashAccounts = accounts.filter((a) => /^111[1-9]$/.test(a.code) && a.isPosting);

  const month = monthRange(currentMonth());
  const [showForm, setShowForm] = useState(false);
  const [providerId, setProviderId] = useState('');
  const [periodStart, setPeriodStart] = useState(month.start);
  const [periodEnd, setPeriodEnd] = useState(month.end);
  const [advances, setAdvances] = useState('');
  const [payFrom, setPayFrom] = useState('1111');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (action: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    setError('');
    try {
      await action();
      after?.();
    } catch (err: any) {
      setError(err?.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const statusColor = (s: string) => (s === 'paid' ? 'text-emerald-400' : s === 'approved' ? 'text-amber-400' : 'text-blue-400');

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
        {can('journals:post') && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="self-start flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#147d9f] hover:bg-[#116986] text-white rounded shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'تسوية جديدة' : 'New Settlement'}</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg p-4 flex flex-wrap items-end gap-3 text-xs">
          <label className="space-y-1 text-slate-400">
            <span>{lang === 'ar' ? 'الكابتن' : 'Captain'}</span>
            <select value={providerId} onChange={(e) => setProviderId(e.target.value)} className={`${inputCls} block min-w-[180px]`}>
              <option value="">{lang === 'ar' ? 'اختر…' : 'Select…'}</option>
              {captains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.commissionRate}%)
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-slate-400">
            <span>{lang === 'ar' ? 'من' : 'From'}</span>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={`${inputCls} block`} />
          </label>
          <label className="space-y-1 text-slate-400">
            <span>{lang === 'ar' ? 'إلى' : 'To'}</span>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={`${inputCls} block`} />
          </label>
          <label className="space-y-1 text-slate-400">
            <span>{lang === 'ar' ? 'السلف المخصومة (1123)' : 'Advances to deduct (1123)'}</span>
            <input type="number" min="0" value={advances} onChange={(e) => setAdvances(e.target.value)} className={`${inputCls} block w-32`} />
          </label>
          <button
            disabled={busy || !providerId}
            onClick={() =>
              run(
                () => createProviderSettlement({ providerId, periodStart, periodEnd, advancesDeducted: Number(advances) || 0 }),
                () => {
                  setShowForm(false);
                  setAdvances('');
                },
              )
            }
            className="px-3.5 py-1.5 font-semibold bg-[#fdfb45] text-[#0c1226] rounded disabled:opacity-50"
          >
            {lang === 'ar' ? 'احتساب' : 'Calculate'}
          </button>
        </div>
      )}

      {error && <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded px-3 py-2">{error}</div>}

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
              {providerSettlements.map((s) => (
                <tr key={s.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#147d9f]">{s.settlementNumber}</td>
                  <td className="py-3 px-4 font-bold text-white">{s.providerName}</td>
                  <td className="py-3 px-4 text-center text-slate-400 font-mono">
                    {s.periodStart} → {s.periodEnd}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-white">{s.totalTrips}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-white">{formatMoney(s.grossRevenue)}</td>
                  <td className="py-3 px-4 text-right font-mono text-[#fdfb45] font-semibold">{formatMoney(s.commissionAmount)} ({s.commissionRate}%)</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-400">-{formatMoney(s.advancesDeducted)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                    {formatMoney(s.netPayable)}
                  </td>
                  <td className="py-3 px-4 text-center space-y-1.5">
                    <span className={`block text-[11px] font-bold uppercase ${statusColor(s.status)}`}>{s.status}</span>
                    {s.status === 'draft' && can('journals:post') && (
                      <button
                        disabled={busy}
                        onClick={() => run(() => approveProviderSettlement(s.id))}
                        className="px-2 py-1 text-[11px] font-semibold bg-[#147d9f] hover:bg-[#116986] text-white rounded disabled:opacity-50"
                      >
                        {lang === 'ar' ? 'اعتماد' : 'Approve'}
                      </button>
                    )}
                    {s.status === 'approved' && can('expenses:create') && (
                      <div className="flex items-center justify-center gap-1">
                        <select value={payFrom} onChange={(e) => setPayFrom(e.target.value)} className={inputCls}>
                          {cashAccounts.map((a) => (
                            <option key={a.code} value={a.code}>
                              {a.code}
                            </option>
                          ))}
                        </select>
                        <button
                          disabled={busy}
                          onClick={() => run(() => payProviderSettlement(s.id, { paidFromAccountCode: payFrom }))}
                          className="px-2 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded disabled:opacity-50"
                        >
                          {lang === 'ar' ? 'سداد' : 'Pay'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {providerSettlements.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 px-4 text-center text-slate-500">
                    {lang === 'ar' ? 'لا توجد تسويات بعد' : 'No settlements yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
