import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { ShieldAlert, Search, Filter, Clock, UserCheck } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const { auditLogs, lang, t } = useErp();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = auditLogs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'سجل التدقيق والأمان والرقابة الداخلية' : 'Audit Trail & Internal Controls'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'سجل غير قابل للتعديل يوثق كافة العمليات: إنشاء، اعتماد، ترحيل، عكس قيود وإقفال الفترات'
              : 'Immutable chronological audit log capturing every financial creation, approval, post, reversal, and period lock.'}
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-[#0a0f21] border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث في سجل العمليات...' : 'Search audit log action or user...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-[#147d9f]"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {filtered.length} {lang === 'ar' ? 'حدث موثق' : 'audit records'}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c142b] text-slate-400 uppercase font-semibold border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-4">{lang === 'ar' ? 'التوقيت والختم الزمني' : 'Timestamp'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'المستخدم المسؤول' : 'Responsible User'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'الإجراء المحاسبي' : 'Action'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'المستند / الكيان' : 'Entity'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'التفاصيل' : 'Details'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-200">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-white">
                    {log.userName}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="font-mono text-[11px] font-bold text-[#147d9f]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-300 font-mono text-[11px]">
                    {log.entity}: {log.entityId}
                  </td>
                  <td className="py-2.5 px-4 text-slate-300 max-w-md">
                    {log.details}
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
