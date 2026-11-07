import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { ShoppingCart, Plus } from 'lucide-react';

const inputCls =
  'bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#147d9f]';

const today = () => new Date().toISOString().split('T')[0];

export const PurchasesView: React.FC = () => {
  const {
    suppliers,
    accounts,
    expenseMappings,
    purchaseInvoices,
    currentUser,
    createPurchaseInvoice,
    approvePurchaseInvoice,
    payPurchaseInvoice,
    formatMoney,
    lang,
  } = useErp();

  const permissions: string[] = (currentUser as any)?.permissions || [];
  const canPost = permissions.includes('*') || permissions.includes('expenses:create');
  const cashAccounts = accounts.filter((a) => /^111[1-9]$/.test(a.code) && a.isPosting);
  // Expense accounts, plus the asset accounts the expense mappings capitalise to.
  const mapped = new Set(expenseMappings.map((m) => m.defaultAccountCode));
  const lineAccounts = accounts.filter(
    (a) => a.isPosting && (a.type === 'Expense' || (a.type === 'Asset' && mapped.has(a.code))),
  );

  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [date, setDate] = useState(today());
  const [dueDate, setDueDate] = useState(today());
  const [description, setDescription] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [accountCode, setAccountCode] = useState('5160');
  const [payFrom, setPayFrom] = useState('1111');
  const [payAmount, setPayAmount] = useState<Record<string, string>>({});
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

  const describe = (po: (typeof purchaseInvoices)[number]) =>
    po.notes || po.lines.map((l) => l.description).filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'فواتير المشتريات والذمم الدائنة' : 'Purchases & Supplier Invoices'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'تسجيل فواتير شراء المعدات البحرية وقطع الغيار والخدمات مع متابعة أرصدة الموردين'
              : 'Record vendor bills for marine equipment, spare parts, and boat maintenance with AP tracking.'}
          </p>
        </div>
        {canPost && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="self-start flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#147d9f] hover:bg-[#116986] text-white rounded shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'فاتورة شراء جديدة' : 'New Bill'}</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg p-4 flex flex-wrap items-end gap-3 text-xs">
          <label className="space-y-1 text-slate-400">
            <span>{lang === 'ar' ? 'المورد' : 'Supplier'}</span>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={`${inputCls} block min-w-[160px]`}>
              <option value="">{lang === 'ar' ? 'مورد جديد…' : 'New supplier…'}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {!supplierId && (
            <label className="space-y-1 text-slate-400">
              <span>{lang === 'ar' ? 'اسم المورد' : 'Supplier name'}</span>
              <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className={`${inputCls} block`} />
            </label>
          )}
          <label className="space-y-1 text-slate-400">
            <span>{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} block`} />
          </label>
          <label className="space-y-1 text-slate-400">
            <span>{lang === 'ar' ? 'الاستحقاق' : 'Due'}</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${inputCls} block`} />
          </label>
          <label className="space-y-1 text-slate-400">
            <span>{lang === 'ar' ? 'الوصف' : 'Description'}</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} block min-w-[180px]`} />
          </label>
          <label className="space-y-1 text-slate-400">
            <span>{lang === 'ar' ? 'الحساب' : 'Account'}</span>
            <select value={accountCode} onChange={(e) => setAccountCode(e.target.value)} className={`${inputCls} block max-w-[220px]`}>
              {lineAccounts.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} {lang === 'ar' ? a.nameAr : a.nameEn}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-slate-400">
            <span>{lang === 'ar' ? 'الكمية' : 'Qty'}</span>
            <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className={`${inputCls} block w-20`} />
          </label>
          <label className="space-y-1 text-slate-400">
            <span>{lang === 'ar' ? 'سعر الوحدة' : 'Unit price'}</span>
            <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputCls} block w-28`} />
          </label>
          <button
            disabled={busy || !price || (!supplierId && !supplierName.trim())}
            onClick={() =>
              run(
                () =>
                  createPurchaseInvoice({
                    supplierId: supplierId || undefined,
                    supplierName,
                    date,
                    dueDate,
                    lines: [{ description, quantity: Number(qty) || 1, unitPrice: Number(price), expenseOrAssetAccountCode: accountCode }],
                  }),
                () => {
                  setShowForm(false);
                  setDescription('');
                  setPrice('');
                  setSupplierName('');
                },
              )
            }
            className="px-3.5 py-1.5 font-semibold bg-[#fdfb45] text-[#0c1226] rounded disabled:opacity-50"
          >
            {lang === 'ar' ? 'حفظ كمسودة' : 'Save Draft'}
          </button>
        </div>
      )}

      {error && <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded px-3 py-2">{error}</div>}

      {/* Purchases Table */}
      <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c142b] text-slate-400 uppercase font-semibold border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-4">{lang === 'ar' ? 'رقم الفاتورة' : 'Bill #'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'المورد' : 'Supplier'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'التاريخ والاستحقاق' : 'Date & Due'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'الوصف' : 'Description'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'المسدد' : 'Paid'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'المتبقي' : 'Balance'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-200">
              {purchaseInvoices.map((po) => (
                <tr key={po.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#147d9f]">{po.invoiceNumber}</td>
                  <td className="py-3 px-4 font-bold text-white">{po.supplierName}</td>
                  <td className="py-3 px-4 text-slate-400 font-mono">
                    <div>{po.date}</div>
                    <div className="text-[10px] text-slate-500">{lang === 'ar' ? 'الاستحقاق:' : 'Due:'} {po.dueDate}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300 max-w-xs">{describe(po)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-white">{formatMoney(po.total)}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">{formatMoney(po.paidAmount)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-red-400">{formatMoney(po.balance)}</td>
                  <td className="py-3 px-4 text-center space-y-1.5">
                    <span className={`block text-[11px] font-bold ${po.status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {po.status.toUpperCase()}
                    </span>
                    {po.status === 'draft' && canPost && (
                      <button
                        disabled={busy}
                        onClick={() => run(() => approvePurchaseInvoice(po.id))}
                        className="px-2 py-1 text-[11px] font-semibold bg-[#147d9f] hover:bg-[#116986] text-white rounded disabled:opacity-50"
                      >
                        {lang === 'ar' ? 'اعتماد' : 'Approve'}
                      </button>
                    )}
                    {po.status === 'posted' && canPost && (
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max={po.balance}
                          placeholder={String(po.balance)}
                          value={payAmount[po.id] ?? ''}
                          onChange={(e) => setPayAmount((p) => ({ ...p, [po.id]: e.target.value }))}
                          className={`${inputCls} w-20`}
                        />
                        <select value={payFrom} onChange={(e) => setPayFrom(e.target.value)} className={inputCls}>
                          {cashAccounts.map((a) => (
                            <option key={a.code} value={a.code}>
                              {a.code}
                            </option>
                          ))}
                        </select>
                        <button
                          disabled={busy}
                          onClick={() =>
                            run(
                              () => payPurchaseInvoice(po.id, { amount: Number(payAmount[po.id]) || po.balance, paidFromAccountCode: payFrom }),
                              () => setPayAmount((p) => ({ ...p, [po.id]: '' })),
                            )
                          }
                          className="px-2 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded disabled:opacity-50"
                        >
                          {lang === 'ar' ? 'سداد' : 'Pay'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {purchaseInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 px-4 text-center text-slate-500">
                    {lang === 'ar' ? 'لا توجد فواتير شراء بعد' : 'No purchase bills yet'}
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
