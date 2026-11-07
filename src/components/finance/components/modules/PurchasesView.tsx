import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { ShoppingCart, Plus, Search, DollarSign, CheckCircle2, X } from 'lucide-react';

export const PurchasesView: React.FC = () => {
  const { suppliers, accounts, formatMoney, lang, t } = useErp();

  const [purchases, setPurchases] = useState([
    {
      id: 'po-01',
      invoiceNumber: 'PINV-2026-001',
      supplierName: 'Aswan Marine Gear & Fiberglass',
      date: '2026-10-25',
      dueDate: '2026-11-15',
      total: 12500,
      paidAmount: 0,
      balance: 12500,
      status: 'posted',
      description: 'Fiberglass resin, marine paint & composite paddle spares',
    },
    {
      id: 'po-02',
      invoiceNumber: 'PINV-2026-002',
      supplierName: 'Nubian Dream Guest House (Gharb Soheil)',
      date: '2026-10-31',
      dueDate: '2026-11-10',
      total: 6200,
      paidAmount: 6200,
      balance: 0,
      status: 'paid',
      description: 'Monthly landing dock maintenance and hospitality refreshments',
    },
  ]);

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
      </div>

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
              {purchases.map((po) => (
                <tr key={po.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#147d9f]">{po.invoiceNumber}</td>
                  <td className="py-3 px-4 font-bold text-white">{po.supplierName}</td>
                  <td className="py-3 px-4 text-slate-400 font-mono">
                    <div>{po.date}</div>
                    <div className="text-[10px] text-slate-500">Due: {po.dueDate}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300 max-w-xs">{po.description}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-white">{formatMoney(po.total)}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">{formatMoney(po.paidAmount)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-red-400">{formatMoney(po.balance)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[11px] font-bold ${po.status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {po.status.toUpperCase()}
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
