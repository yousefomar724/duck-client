import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { ExpenseVoucher, ExpenseLine } from '../../types/erp';
import {
  ArrowRightLeft,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  X,
  Layers,
  Building,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

export const ExpensesView: React.FC = () => {
  const { expenses, accounts, expenseMappings, createExpense, formatMoney, lang, t } = useErp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    voucherNumber: `EXP-2026-${String(expenses.length + 101).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    beneficiary: '',
    paymentMethod: 'Cash on Hand',
    paidFromAccountCode: '1111',
    costCenter: 'CC-ELPH',
    relatedActivity: 'Kayak',
    relatedLocation: 'Elephantine Island Dock',
    notes: '',
    lines: [
      {
        description: 'Captain tour commission & logistics',
        categoryId: 'cat-1',
        amount: 300,
        expenseAccountCode: '5110',
        costCenter: 'CC-ELPH',
      },
    ],
  });

  const totalAmount = formData.lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  const handleAddLine = () => {
    setFormData((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          description: '',
          categoryId: 'cat-5',
          amount: 100,
          expenseAccountCode: '5160',
          costCenter: prev.costCenter,
        },
      ],
    }));
  };

  const handleRemoveLine = (idx: number) => {
    if (formData.lines.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx),
    }));
  };

  const handleLineChange = (idx: number, field: string, value: any) => {
    setFormData((prev) => {
      const updated = [...prev.lines];
      const cur = { ...updated[idx], [field]: value };

      // When category changes, auto map default account code
      if (field === 'categoryId') {
        const mapping = expenseMappings.find((m) => m.id === value);
        if (mapping) {
          cur.expenseAccountCode = mapping.defaultAccountCode;
        }
      }
      updated[idx] = cur;
      return { ...prev, lines: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createExpense(formData);
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Expense voucher error: ${err?.message}`);
    }
  };

  const filtered = expenses.filter(
    (exp) =>
      exp.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.beneficiary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'سندات صرف المصروفات والمدفوعات' : 'Expense & Payment Vouchers'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'صرف المصروفات والعمولات مع الربط المحاسبي الدقيق وتوجيه مراكز التكلفة'
              : 'Disburse operating costs, commissions, and supplier advances with strict Chart of Accounts mapping.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 text-[#0c1226]" />
          <span>{lang === 'ar' ? 'إنشاء سند صرف جديد' : 'New Expense Voucher'}</span>
        </button>
      </div>

      {/* Category Accounting Mapping Notice */}
      <div className="bg-[#0c142b] border border-slate-800 p-3 rounded-lg text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-300">
          <AlertCircle className="w-4 h-4 text-[#fdfb45] shrink-0" />
          <span>
            {lang === 'ar'
              ? 'الربط المحاسبي المعتمد: تصنيف بنود الصرف يحدد تلقائياً الحساب المدين (تكاليف تشغيل أو رأسمالية أو توزيعات)'
              : 'Configurable Chart of Accounts mapping enforces direct Cost of Revenue vs Capitalization vs Equity distributions.'}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">13 Active Category Mappings</span>
      </div>

      {/* Search & Stats Bar */}
      <div className="bg-[#0a0f21] border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث برقم السند، المستفيد أو البيان...' : 'Search voucher #, beneficiary...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-[#147d9f]"
          />
        </div>

        <div className="text-xs text-slate-400 font-mono">
          {filtered.length} {lang === 'ar' ? 'سند صرف' : 'expense vouchers'}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c142b] text-slate-400 uppercase font-semibold border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-4">{lang === 'ar' ? 'رقم السند' : 'Voucher #'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'المستفيد / المورد' : 'Beneficiary'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'البنود والتصنيف' : 'Lines & Categories'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'طريقة الصرف' : 'Paid From Account'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'إجمالي المبلغ' : 'Total Amount'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-200">
              {filtered.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#147d9f]">{exp.voucherNumber}</td>
                  <td className="py-3 px-4 text-slate-300 font-mono">{exp.date}</td>
                  <td className="py-3 px-4 font-semibold text-white">{exp.beneficiary}</td>
                  <td className="py-3 px-4">
                    <div className="text-slate-200 font-medium">{exp.lines.length} {lang === 'ar' ? 'بند صرف' : 'expense lines'}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                      {exp.lines.map((l) => l.description || l.categoryId).join(' · ')}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div>{exp.paymentMethod}</div>
                    <div className="text-[10px] text-slate-500 font-mono">Acc {exp.paidFromAccountCode}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-red-400 text-sm">
                    {formatMoney(exp.totalAmount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{exp.status.toUpperCase()}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0f21] border border-slate-700 w-full max-w-2xl rounded-lg shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#fdfb45]" />
                <span>{lang === 'ar' ? 'سند صرف مصروفات جديد' : 'New Expense Payment Voucher'}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'رقم السند' : 'Voucher Number'}</label>
                  <input
                    type="text"
                    required
                    value={formData.voucherNumber}
                    onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'التاريخ' : 'Date'}</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'المستفيد / المورد' : 'Beneficiary / Payee'}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Captain Hamada or Nubian Guest House"
                    value={formData.beneficiary}
                    onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'طريقة الصرف والحساب' : 'Paid From Account'}</label>
                  <select
                    value={formData.paidFromAccountCode}
                    onChange={(e) => {
                      const acc = e.target.value;
                      let meth = 'Cash on Hand';
                      if (acc === '1112') meth = 'CIB Bank Account';
                      else if (acc === '1113') meth = 'Vodafone Cash';
                      else if (acc === '1114') meth = 'InstaPay Account';
                      setFormData({ ...formData, paidFromAccountCode: acc, paymentMethod: meth });
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                  >
                    <option value="1111">1111 - Main Cash on Hand (خزينة نقدية)</option>
                    <option value="1112">1112 - CIB Bank Account (بنك CIB)</option>
                    <option value="1113">1113 - Vodafone Cash (فودافون كاش)</option>
                    <option value="1114">1114 - InstaPay (إنستاباي)</option>
                  </select>
                </div>
              </div>

              {/* Expense Lines Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    {lang === 'ar' ? 'بنود المصروف (Multi-line Expenses)' : 'Expense Lines'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-2.5 py-1 text-xs font-semibold text-[#147d9f] bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'إضافة بند' : 'Add Line'}</span>
                  </button>
                </div>

                <div className="border border-slate-800 rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0c142b] text-slate-400 font-semibold">
                      <tr>
                        <th className="p-2">{lang === 'ar' ? 'التصنيف المحاسبي' : 'Category Mapping'}</th>
                        <th className="p-2">{lang === 'ar' ? 'الوصف / البيان' : 'Description'}</th>
                        <th className="p-2 w-28 text-right">{lang === 'ar' ? 'المبلغ (ج.م)' : 'Amount'}</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {formData.lines.map((line, idx) => (
                        <tr key={idx} className="bg-slate-900/40">
                          <td className="p-2">
                            <select
                              value={line.categoryId}
                              onChange={(e) => handleLineChange(idx, 'categoryId', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200"
                            >
                              {expenseMappings.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {lang === 'ar' ? m.categoryNameAr : m.categoryNameEn} ({m.defaultAccountCode})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              placeholder="e.g. Captain commission for sunset trip"
                              value={line.description}
                              onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              required
                              min="1"
                              value={line.amount}
                              onChange={(e) => handleLineChange(idx, 'amount', Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-red-400 font-mono font-bold text-right"
                            />
                          </td>
                          <td className="p-2 text-center">
                            {formData.lines.length > 1 && (
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

              {/* Total & Preview */}
              <div className="flex items-center justify-between p-3 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-xs font-bold text-slate-300">{lang === 'ar' ? 'إجمالي سند الصرف:' : 'Total Voucher Amount:'}</span>
                <span className="text-base font-bold font-mono text-red-400">{formatMoney(totalAmount)}</span>
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
                  className="px-5 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-sm"
                >
                  {lang === 'ar' ? 'حفظ وترحيل سند الصرف' : 'Save & Post Expense Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
