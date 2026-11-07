import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { Building2, Search, Plus, Phone, DollarSign } from 'lucide-react';

export const SuppliersView: React.FC = () => {
  const { suppliers, formatMoney, lang, t } = useErp();
  const [searchQuery, setSearchQuery] = useState('');

  const totalPayables = suppliers.reduce((s, sup) => s + sup.balance, 0);

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.nameAr && s.nameAr.includes(searchQuery)) ||
      s.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'الموردون ومقدمو الخدمات (Suppliers & Providers)' : 'Suppliers & Providers'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'موردي معدات الفيبرجلاس والبيوت النوبية وأساطيل المراكبية مع متابعة الذمم الدائنة'
              : 'Marine gear vendors, boat operators, and Nubian guest houses with accounts payable tracking.'}
          </p>
        </div>

        <div className="px-3.5 py-1.5 bg-[#0c142b] border border-slate-700 rounded text-xs flex items-center gap-2">
          <span className="text-slate-400">{lang === 'ar' ? 'إجمالي مستحقات الموردين:' : 'Total Payables:'}</span>
          <span className="font-mono font-bold text-red-400 text-sm">
            {formatMoney(totalPayables)}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#0a0f21] border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث باسم المورد أو الهاتف...' : 'Search supplier name or phone...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-[#147d9f]"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {filtered.length} {lang === 'ar' ? 'مورد مسجل' : 'suppliers'}
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c142b] text-slate-400 uppercase font-semibold border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-4">{lang === 'ar' ? 'المورد / الجهة' : 'Supplier / Provider'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'نوع النشاط' : 'Category / Type'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'مسؤول الاتصال' : 'Contact Person'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'الهاتف' : 'Phone'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'الرصيد الدائن المستحق' : 'Payable Balance'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-200">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-white">
                    <div>{s.name}</div>
                    {s.nameAr && <div className="text-[11px] text-slate-400">{s.nameAr}</div>}
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-medium">{s.type}</td>
                  <td className="py-3 px-4 text-slate-300">{s.contactPerson || '-'}</td>
                  <td className="py-3 px-4 text-slate-300 font-mono">{s.phone}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-red-400">
                    {formatMoney(s.balance)}
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
