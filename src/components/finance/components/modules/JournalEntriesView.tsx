import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { JournalEntry, JournalLine } from '../../types/erp';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Trash2,
  FileText,
  Layers,
  Scale,
} from 'lucide-react';

export const JournalEntriesView: React.FC = () => {
  const { journalEntries, accounts, createJournal, reverseJournal, formatMoney, lang, t } = useErp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reversingEntry, setReversingEntry] = useState<JournalEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Manual Journal Form State
  const [newJournal, setNewJournal] = useState<{
    journalNumber: string;
    date: string;
    description: string;
    lines: {
      accountCode: string;
      debit: number;
      credit: number;
      description: string;
      costCenter: string;
    }[];
  }>({
    journalNumber: `JV-2026-${String(journalEntries.length + 101).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    description: 'Manual adjustment entry',
    lines: [
      { accountCode: '1111', debit: 1000, credit: 0, description: '', costCenter: 'CC-MAIN' },
      { accountCode: '4110', debit: 0, credit: 1000, description: '', costCenter: 'CC-MAIN' },
    ],
  });

  const totalDebits = newJournal.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredits = newJournal.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

  const handleAddLine = () => {
    setNewJournal((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        { accountCode: '1111', debit: 0, credit: 0, description: '', costCenter: 'CC-MAIN' },
      ],
    }));
  };

  const handleRemoveLine = (idx: number) => {
    if (newJournal.lines.length <= 2) return;
    setNewJournal((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx),
    }));
  };

  const handleLineChange = (idx: number, field: string, val: any) => {
    setNewJournal((prev) => {
      const updated = [...prev.lines];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, lines: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert('Debit and credit must be balanced and greater than zero.');
      return;
    }

    try {
      const payload = {
        journalNumber: newJournal.journalNumber,
        date: newJournal.date,
        periodId: 'p-2026-11',
        sourceDocument: 'ManualJournal',
        sourceDocumentNumber: newJournal.journalNumber,
        description: newJournal.description,
        lines: newJournal.lines.map((l, i) => {
          const acc = accounts.find((a) => a.code === l.accountCode);
          return {
            id: `jl-m-${Date.now()}-${i}`,
            accountCode: l.accountCode,
            accountNameAr: acc?.nameAr || '',
            accountNameEn: acc?.nameEn || '',
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            description: l.description || newJournal.description,
            costCenter: l.costCenter,
          };
        }),
        status: 'posted',
      };

      await createJournal(payload);
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Journal entry error: ${err?.message}`);
    }
  };

  const handleConfirmReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingEntry) return;
    try {
      await reverseJournal(reversingEntry.id, reversalReason);
      setReversingEntry(null);
      setReversalReason('');
    } catch (err: any) {
      alert(`Reversal failed: ${err?.message}`);
    }
  };

  const filtered = journalEntries.filter(
    (je) =>
      je.journalNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      je.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      je.sourceDocumentNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'سجل قيود اليومية المحاسبية' : 'Journal Entries Register'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'محرك القيد المزدوج الإلزامي: تطابق المدين والدائن مع الحصانة من التعديل المباشر وإمكانية العكس المحاسبي'
              : 'Double-entry engine enforcing Total Debits = Total Credits, immutability, and audited accounting reversals.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 text-[#0c1226]" />
          <span>{lang === 'ar' ? 'إنشاء قيد يومية يدوي' : 'New Manual Journal'}</span>
        </button>
      </div>

      {/* Double-Entry Compliance Badge */}
      <div className="bg-[#0c142b] border border-slate-800 p-3.5 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-slate-200 font-semibold">
            {lang === 'ar'
              ? 'قاعدة القيد المزدوج مفعلة: كافة القيود مرحلة بتوازن تام (المدين = الدائن)'
              : 'Strict Double-Entry Enforcement: 100% of posted entries have Debit = Credit with audit links.'}
          </span>
        </div>
        <div className="text-xs font-mono font-bold text-emerald-400">Balanced · Certified</div>
      </div>

      {/* Search Input */}
      <div className="bg-[#0a0f21] border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث برقم القيد، المستند أو البيان...' : 'Search journal #, source doc, description...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-[#147d9f]"
          />
        </div>

        <div className="text-xs text-slate-400 font-mono">
          {filtered.length} {lang === 'ar' ? 'قيد محاسبي' : 'journal entries'}
        </div>
      </div>

      {/* Journal Entries List */}
      <div className="space-y-4">
        {filtered.map((je) => (
          <div key={je.id} className="bg-[#0a0f21] border border-slate-800/80 rounded-lg overflow-hidden">
            {/* Journal Header Bar */}
            <div className="bg-[#0c142b] p-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-sm text-[#147d9f]">{je.journalNumber}</span>
                <span className="text-slate-400 font-mono">{je.date}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-300 font-medium">
                  {je.sourceDocument}: <strong className="text-white">{je.sourceDocumentNumber}</strong>
                </span>
                {je.isReversal && (
                  <span className="text-[10px] font-bold text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800">
                    REVERSAL ENTRY
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{lang === 'ar' ? 'إجمالي القيد:' : 'Total:'}</span>
                  <span className="font-mono font-bold text-white">{formatMoney(je.totalDebit)}</span>
                </div>

                <span
                  className={`text-[11px] font-bold ${
                    je.status === 'posted' ? 'text-emerald-400' : je.status === 'reversed' ? 'text-red-400' : 'text-amber-400'
                  }`}
                >
                  {je.status.toUpperCase()}
                </span>

                {je.status === 'posted' && !je.isReversal && (
                  <button
                    onClick={() => {
                      setReversingEntry(je);
                      setReversalReason('');
                    }}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-400 transition-colors"
                    title={lang === 'ar' ? 'عكس القيد المحاسبي' : 'Reverse Journal'}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{lang === 'ar' ? 'عكس القيد' : 'Reverse'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Description & Lines */}
            <div className="p-3 space-y-2">
              <div className="text-xs text-slate-300 font-medium">{je.description}</div>

              <div className="border border-slate-800/60 rounded overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-1.5 px-3">{lang === 'ar' ? 'كود الحساب' : 'Account'}</th>
                      <th className="py-1.5 px-3">{lang === 'ar' ? 'اسم الحساب' : 'Account Name'}</th>
                      <th className="py-1.5 px-3">{lang === 'ar' ? 'البيان' : 'Line Description'}</th>
                      <th className="py-1.5 px-3">{lang === 'ar' ? 'مركز التكلفة' : 'Cost Center'}</th>
                      <th className="py-1.5 px-3 text-right">{lang === 'ar' ? 'مدين (Debit)' : 'Debit'}</th>
                      <th className="py-1.5 px-3 text-right">{lang === 'ar' ? 'دائن (Credit)' : 'Credit'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-200">
                    {je.lines.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-900/30">
                        <td className="py-1.5 px-3 font-mono font-bold text-[#147d9f]">{l.accountCode}</td>
                        <td className="py-1.5 px-3 font-medium">{lang === 'ar' ? l.accountNameAr : l.accountNameEn}</td>
                        <td className="py-1.5 px-3 text-slate-400 text-[11px]">{l.description || '-'}</td>
                        <td className="py-1.5 px-3 text-slate-400 text-[11px] font-mono">{l.costCenter || '-'}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-white">
                          {l.debit > 0 ? formatMoney(l.debit) : '-'}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-white">
                          {l.credit > 0 ? formatMoney(l.credit) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE MANUAL JOURNAL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0f21] border border-slate-700 w-full max-w-3xl rounded-lg shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#fdfb45]" />
                <span>{lang === 'ar' ? 'إنشاء قيد يومية محاسبي يدوي' : 'Create Manual Double-Entry Journal'}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'رقم القيد' : 'Journal Number'}</label>
                  <input
                    type="text"
                    required
                    value={newJournal.journalNumber}
                    onChange={(e) => setNewJournal({ ...newJournal, journalNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'تاريخ القيد' : 'Date'}</label>
                  <input
                    type="date"
                    required
                    value={newJournal.date}
                    onChange={(e) => setNewJournal({ ...newJournal, date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'البيان العام' : 'General Description'}</label>
                  <input
                    type="text"
                    required
                    value={newJournal.description}
                    onChange={(e) => setNewJournal({ ...newJournal, description: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                  />
                </div>
              </div>

              {/* Lines Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">
                    {lang === 'ar' ? 'أطراف القيد (المدين والدائن)' : 'Journal Debit & Credit Lines'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-2.5 py-1 text-xs font-semibold text-[#147d9f] bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'إضافة سطر' : 'Add Line'}</span>
                  </button>
                </div>

                <div className="border border-slate-800 rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0c142b] text-slate-400 font-semibold">
                      <tr>
                        <th className="p-2">{lang === 'ar' ? 'الحساب' : 'Account'}</th>
                        <th className="p-2 w-28 text-right">{lang === 'ar' ? 'مدين (Dr)' : 'Debit'}</th>
                        <th className="p-2 w-28 text-right">{lang === 'ar' ? 'دائن (Cr)' : 'Credit'}</th>
                        <th className="p-2">{lang === 'ar' ? 'البيان' : 'Line Description'}</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {newJournal.lines.map((line, idx) => (
                        <tr key={idx} className="bg-slate-900/40">
                          <td className="p-2">
                            <select
                              value={line.accountCode}
                              onChange={(e) => handleLineChange(idx, 'accountCode', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200"
                            >
                              {accounts
                                .filter((a) => a.isPosting)
                                .map((a) => (
                                  <option key={a.code} value={a.code}>
                                    {a.code} - {lang === 'ar' ? a.nameAr : a.nameEn}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={line.debit}
                              onChange={(e) => handleLineChange(idx, 'debit', Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-100 font-mono text-right"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={line.credit}
                              onChange={(e) => handleLineChange(idx, 'credit', Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-100 font-mono text-right"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200"
                            />
                          </td>
                          <td className="p-2 text-center">
                            {newJournal.lines.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(idx)}
                                className="text-slate-400 hover:text-red-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Debit/Credit Balance Verification Indicator */}
              <div
                className={`p-3 rounded border flex items-center justify-between text-xs font-mono font-bold ${
                  isBalanced
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-400'
                    : 'bg-red-950/40 border-red-800/80 text-red-400'
                }`}
              >
                <div>
                  {lang === 'ar' ? 'إجمالي المدين:' : 'Total Debits:'} {formatMoney(totalDebits)}
                </div>
                <div>
                  {lang === 'ar' ? 'إجمالي الدائن:' : 'Total Credits:'} {formatMoney(totalCredits)}
                </div>
                <div>
                  {isBalanced
                    ? '✓ BALANCED (المدين = الدائن)'
                    : `✗ UNBALANCED (Diff: ${Math.abs(totalDebits - totalCredits).toFixed(2)})`}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!isBalanced}
                  className="px-5 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 disabled:opacity-40 rounded shadow-sm"
                >
                  {lang === 'ar' ? 'حفظ وترحيل القيد للأستاذ العام' : 'Save & Post to General Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVERSAL REASON MODAL */}
      {reversingEntry && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0a0f21] border border-slate-700 w-full max-w-md rounded-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-red-400" />
                <span>{lang === 'ar' ? 'عكس قيد محاسبي مرحل' : 'Reverse Posted Journal Entry'}</span>
              </h3>
              <button onClick={() => setReversingEntry(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              {lang === 'ar'
                ? `سيتم توليد قيد عكسي لقيد رقم ${reversingEntry.journalNumber} مع تبديل المدين والدائن لضمان سلامة التدقيق.`
                : `A reversal entry will be created for ${reversingEntry.journalNumber} with inverted debits and credits.`}
            </p>

            <form onSubmit={handleConfirmReversal} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'سبب العكس المحاسبي' : 'Reason for Reversal'}</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Transaction posted with incorrect customer classification"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReversingEntry(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded"
                >
                  {lang === 'ar' ? 'تأكيد العكس المحاسبي' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
