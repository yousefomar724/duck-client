import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { CustomerReceipt } from '../../types/erp';
import { DollarSign, Plus, Search, CheckCircle2, FileText, ArrowDownRight, X } from 'lucide-react';

export const ReceiptsView: React.FC = () => {
  const { receipts, invoices, customers, accounts, createReceipt, formatMoney, lang, t } = useErp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    receiptNumber: `RCP-2026-${String(receipts.length + 101).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    customerName: '',
    invoiceId: '',
    amount: 0,
    paymentMethod: 'Cash on Hand',
    receivingAccountCode: '1111',
    reference: '',
    notes: '',
  });

  const handleInvoiceSelect = (invId: string) => {
    const inv = invoices.find((i) => i.id === invId);
    if (inv) {
      setFormData((prev) => ({
        ...prev,
        invoiceId: inv.id,
        customerId: inv.customerId,
        customerName: inv.customerName,
        amount: inv.balance > 0 ? inv.balance : inv.total,
        notes: `Settlement for invoice ${inv.invoiceNumber}`,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createReceipt(formData);
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Receipt error: ${err?.message}`);
    }
  };

  const filtered = receipts.filter(
    (r) =>
      r.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.reference && r.reference.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'سندات قبض العملاء والتحصيلات' : 'Customer Receipts & Collections'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'تسجيل تحصيلات العملاء مع التوليد الفوري لقيود الإقفال المدينة والدائنة'
              : 'Record customer payments, allocate to invoices, and automatically post balancing journal entries.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 text-[#0c1226]" />
          <span>{lang === 'ar' ? 'إنشاء سند قبض جديد' : 'New Customer Receipt'}</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#0a0f21] border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث برقم السند، العميل أو الفاتورة...' : 'Search receipt #, customer, invoice...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-[#147d9f]"
          />
        </div>

        <div className="text-xs text-slate-400 font-mono">
          {filtered.length} {lang === 'ar' ? 'سند قبض' : 'receipts recorded'}
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c142b] text-slate-400 uppercase font-semibold border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-4">{lang === 'ar' ? 'رقم السند' : 'Receipt #'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'العميل' : 'Customer'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'الفاتورة المرتبطة' : 'Linked Invoice'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'طريقة الدفع والحساب' : 'Method & Receiving Acc'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'المبلغ' : 'Amount'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'الحالة والترحيل' : 'Journal Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-200">
              {filtered.map((rcp) => (
                <tr key={rcp.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#147d9f]">{rcp.receiptNumber}</td>
                  <td className="py-3 px-4 text-slate-300 font-mono">{rcp.date}</td>
                  <td className="py-3 px-4 font-semibold text-white">{rcp.customerName}</td>
                  <td className="py-3 px-4">
                    {rcp.invoiceNumber ? (
                      <span className="font-mono text-[#fdfb45] font-semibold">{rcp.invoiceNumber}</span>
                    ) : (
                      <span className="text-slate-500 italic">Unallocated / General</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div>{rcp.paymentMethod}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Acc {rcp.receivingAccountCode} {rcp.reference ? `· ${rcp.reference}` : ''}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                    {formatMoney(rcp.amount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{rcp.status.toUpperCase()}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE RECEIPT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0a0f21] border border-slate-700 w-full max-w-lg rounded-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#fdfb45]" />
                <span>{lang === 'ar' ? 'سند قبض وتحصيل نقدية / بنك' : 'New Customer Receipt Voucher'}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'رقم السند' : 'Receipt Number'}</label>
                  <input
                    type="text"
                    required
                    value={formData.receiptNumber}
                    onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
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

              {/* Linked Invoice Option */}
              <div>
                <label className="block text-slate-400 mb-1">
                  {lang === 'ar' ? 'تخصيص لفاتورة مستحقة (اختياري)' : 'Link to Outstanding Invoice (Optional)'}
                </label>
                <select
                  value={formData.invoiceId}
                  onChange={(e) => handleInvoiceSelect(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                >
                  <option value="">-- {lang === 'ar' ? 'قبض عام / غير مخصص' : 'General / Direct Receipt'} --</option>
                  {invoices
                    .filter((inv) => inv.balance > 0)
                    .map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.customerName} (Bal: {inv.balance} EGP)
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'اسم العميل' : 'Customer Name'}</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'مبلغ التحصيل (ج.م)' : 'Amount (EGP)'}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-emerald-400 font-mono font-bold text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'وسيلة الدفع' : 'Payment Method'}</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => {
                      const meth = e.target.value;
                      let acc = '1111';
                      if (meth.includes('Bank') || meth.includes('CIB')) acc = '1112';
                      else if (meth.includes('Vodafone')) acc = '1113';
                      else if (meth.includes('InstaPay')) acc = '1114';
                      setFormData({ ...formData, paymentMethod: meth, receivingAccountCode: acc });
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                  >
                    <option value="Cash on Hand">Cash on Hand (الخزينة النقدية)</option>
                    <option value="InstaPay">InstaPay (إنستاباي)</option>
                    <option value="Vodafone Cash">Vodafone Cash (فودافون كاش)</option>
                    <option value="Bank Transfer - CIB">Bank Transfer - CIB (بنك CIB)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'حساب الإيداع' : 'Receiving Account'}</label>
                  <select
                    value={formData.receivingAccountCode}
                    onChange={(e) => setFormData({ ...formData, receivingAccountCode: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100 font-mono"
                  >
                    <option value="1111">1111 - Main Cash on Hand</option>
                    <option value="1112">1112 - CIB Bank Egypt</option>
                    <option value="1113">1113 - Vodafone Cash</option>
                    <option value="1114">1114 - InstaPay Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'رقم المعاملة / المرجع' : 'Transaction Reference'}</label>
                <input
                  type="text"
                  placeholder="e.g. INSTA-992140 or Cash Slip #22"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'البيان والملاحظات' : 'Notes'}</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                ></textarea>
              </div>

              {/* Journal Preview Notice */}
              <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">
                  {lang === 'ar' ? 'معاينة القيد المحاسبي الآلي:' : 'Automated Double-Entry Preview:'}
                </div>
                <div className="flex justify-between font-mono">
                  <span>Dr. Account {formData.receivingAccountCode} ({formData.paymentMethod}):</span>
                  <span className="text-emerald-400 font-bold">{formatMoney(formData.amount)}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Cr. Account 1121 (Accounts Receivable):</span>
                  <span className="text-emerald-400 font-bold">{formatMoney(formData.amount)}</span>
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
                  className="px-5 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-sm"
                >
                  {lang === 'ar' ? 'حفظ وترحيل السند' : 'Save & Post Receipt Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
