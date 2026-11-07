import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { Customer } from '../../types/erp';
import { Users, Search, Plus, Phone, Mail, MapPin, DollarSign, Layers } from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { customers, formatMoney, lang, t } = useErp();
  const [searchQuery, setSearchQuery] = useState('');

  const totalReceivables = customers.reduce((s, c) => s + c.outstandingBalance, 0);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.nameAr && c.nameAr.includes(searchQuery)) ||
      c.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Users className="w-5 h-5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'دليل وسجلات العملاء (Customers)' : 'Customers Directory'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'متابعة حجوزات العملاء والشركات السياحية والأرصدة المستحقة وسجل السدادات'
              : 'Individual travelers and tourism agencies directory with invoiced totals and receivable balances.'}
          </p>
        </div>

        <div className="px-3.5 py-1.5 bg-[#0c142b] border border-slate-700 rounded text-xs flex items-center gap-2">
          <span className="text-slate-400">{lang === 'ar' ? 'إجمالي مستحقات العملاء:' : 'Total Receivables:'}</span>
          <span className="font-mono font-bold text-amber-300 text-sm">
            {formatMoney(totalReceivables)}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#0a0f21] border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث بالاسم أو الهاتف...' : 'Search customer name or phone...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-[#147d9f]"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {filtered.length} {lang === 'ar' ? 'عميل مسجل' : 'customers'}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c142b] text-slate-400 uppercase font-semibold border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-4">{lang === 'ar' ? 'العميل' : 'Customer Name'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'بيانات الاتصال' : 'Contact'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'النوع والجنسية' : 'Type & Nationality'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'عدد الحجوزات' : 'Bookings'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'إجمالي الفواتير' : 'Invoiced'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'إجمالي المسدد' : 'Paid'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'الرصيد المدين' : 'Outstanding Balance'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-200">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-white">
                    <div>{c.name}</div>
                    {c.nameAr && <div className="text-[11px] text-slate-400">{c.nameAr}</div>}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div>{c.phone}</div>
                    {c.email && <div className="text-[10px] text-slate-500">{c.email}</div>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-slate-300 font-medium">{c.customerType}</span>
                    <span className="text-slate-500 text-[11px] block">{c.nationality}</span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-white">
                    {c.totalBookings}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-white">
                    {formatMoney(c.totalInvoiced)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">
                    {formatMoney(c.totalPaid)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-300">
                    {formatMoney(c.outstandingBalance)}
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
