import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../auth';
import { useErp } from '../../context/ErpContext';
import { GeneralLedgerMovement } from '../../types/erp';
import { Layers, Search, Filter, Calendar, FileText, ArrowRightLeft, BookOpen, Download } from 'lucide-react';

export const GeneralLedgerView: React.FC = () => {
  const { accounts, formatMoney, lang, t } = useErp();

  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [costCenter, setCostCenter] = useState<string>('');
  const [movements, setMovements] = useState<GeneralLedgerMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAccount !== 'all') params.append('accountCode', selectedAccount);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (costCenter) params.append('costCenter', costCenter);

      const res = await apiFetch(`/general-ledger?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMovements(data);
      }
    } catch (err) {
      console.error('Error fetching general ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [selectedAccount, startDate, endDate, costCenter]);

  const totalDebit = movements.reduce((s, m) => s + m.debit, 0);
  const totalCredit = movements.reduce((s, m) => s + m.credit, 0);

  const activeAccObj = accounts.find((a) => a.code === selectedAccount);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'دفتر الأستاذ العام (General Ledger)' : 'General Ledger'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'كشف حركات الحسابات التفصيلية مع احتساب الرصيد المتراكم والربط المباشر بالمستندات الأصلية'
              : 'Detailed account transaction ledger, running balances, and complete source document traceability.'}
          </p>
        </div>

        {selectedAccount !== 'all' && activeAccObj && (
          <div className="px-3.5 py-1.5 bg-[#0c142b] border border-slate-700 rounded text-xs flex items-center gap-2">
            <span className="text-slate-400">{lang === 'ar' ? 'رصيد الحساب الحالي:' : 'Current Balance:'}</span>
            <span className="font-mono font-bold text-[#fdfb45] text-sm">
              {formatMoney(activeAccObj.balance)}
            </span>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0a0f21] border border-slate-800/80 p-4 rounded-lg flex flex-wrap items-center gap-3 text-xs">
        {/* Account Selector */}
        <div className="flex-1 min-w-[220px]">
          <label className="block text-slate-400 mb-1 font-semibold">{lang === 'ar' ? 'الحساب المحاسبي' : 'Select Account'}</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 font-mono"
          >
            <option value="all">-- {lang === 'ar' ? 'كافة الحسابات المتأثرة' : 'All Accounts'} --</option>
            {accounts
              .filter((a) => a.isPosting)
              .map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} - {lang === 'ar' ? a.nameAr : a.nameEn}
                </option>
              ))}
          </select>
        </div>

        {/* Date Filters */}
        <div>
          <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'من تاريخ' : 'Start Date'}</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'إلى تاريخ' : 'End Date'}</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
          />
        </div>

        {/* Cost Center Filter */}
        <div>
          <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'مركز التكلفة' : 'Cost Center'}</label>
          <select
            value={costCenter}
            onChange={(e) => setCostCenter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
          >
            <option value="">{lang === 'ar' ? 'كافة المراكز' : 'All Centers'}</option>
            <option value="CC-ELPH">Elephantine Island Dock</option>
            <option value="CC-SOHL">Gharb Soheil Nubian House</option>
            <option value="CC-MAIN">DUCK Main HQ</option>
          </select>
        </div>

        <div className="ml-auto self-end">
          <button
            onClick={() => {
              setSelectedAccount('all');
              setStartDate('');
              setEndDate('');
              setCostCenter('');
            }}
            className="px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded"
          >
            {lang === 'ar' ? 'إعادة ضبط' : 'Reset'}
          </button>
        </div>
      </div>

      {/* General Ledger Table */}
      <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c142b] text-slate-400 uppercase font-semibold border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-4">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'رقم القيد' : 'Journal #'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'المستند الأصلي' : 'Source Document'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'البيان' : 'Description'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'مركز التكلفة والنشاط' : 'Dimensions'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'حركة مدينة' : 'Debit'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'حركة دائنة' : 'Credit'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'الرصيد الجاري' : 'Running Balance'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-200">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    {lang === 'ar' ? 'لا توجد حركات مسجلة تطابق التصفية الحالية' : 'No movements found matching filters'}
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr
                    key={m.id}
                    className={`transition-colors ${
                      m.sourceDocument === 'OpeningBalance'
                        ? 'bg-amber-500/10 hover:bg-amber-500/15 border-y border-amber-500/30'
                        : 'hover:bg-slate-900/40'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-slate-400">{m.date}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#147d9f]">{m.journalNumber}</td>
                    <td className="py-3 px-4">
                      {m.sourceDocument === 'OpeningBalance' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {lang === 'ar' ? 'رصيد افتتاحي منقول' : 'Opening Balance'}
                        </span>
                      ) : (
                        <>
                          <div className="font-semibold text-white">{m.sourceDocument}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{m.sourceDocumentNumber}</div>
                        </>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs">{m.description}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {m.costCenter ? <span>{m.costCenter}</span> : '-'}
                      {m.activity && <span> · {m.activity}</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-white">
                      {m.debit > 0 ? formatMoney(m.debit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-white">
                      {m.credit > 0 ? formatMoney(m.credit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#fdfb45]">
                      {formatMoney(m.runningBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {movements.length > 0 && (
              <tfoot className="bg-[#0c142b] border-t border-slate-700 font-bold text-white">
                <tr>
                  <td colSpan={5} className="py-3 px-4 uppercase text-slate-400">
                    {lang === 'ar' ? 'إجمالي حركات الفترة المحددة' : 'Period Movements Total'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">{formatMoney(totalDebit)}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatMoney(totalCredit)}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400">
                    {formatMoney(totalDebit - totalCredit)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
