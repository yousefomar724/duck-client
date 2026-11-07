import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { Account, AccountType, NormalBalance } from '../../types/erp';
import { Network, Plus, Search, Edit3, X, Check, FileText } from 'lucide-react';

export const ChartOfAccountsView: React.FC = () => {
  const { accounts, createAccount, updateAccount, formatMoney, lang, theme } = useErp();
  const isLight = theme === 'light';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [newAcc, setNewAcc] = useState<{
    code: string;
    nameAr: string;
    nameEn: string;
    type: AccountType;
    parentCode: string;
    normalBalance: NormalBalance;
    isPosting: boolean;
    currency: string;
    description: string;
  }>({
    code: '',
    nameAr: '',
    nameEn: '',
    type: 'Expense',
    parentCode: '5100',
    normalBalance: 'Debit',
    isPosting: true,
    currency: 'EGP',
    description: '',
  });

  const [editForm, setEditForm] = useState<{
    nameEn: string;
    nameAr: string;
    description: string;
  }>({
    nameEn: '',
    nameAr: '',
    description: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAccount({
        code: newAcc.code,
        nameAr: newAcc.nameAr,
        nameEn: newAcc.nameEn,
        type: newAcc.type,
        parentCode: newAcc.parentCode || undefined,
        normalBalance: newAcc.normalBalance,
        isPosting: newAcc.isPosting,
        currency: newAcc.currency,
        balance: 0,
        active: true,
        description: newAcc.description,
      });
      setIsModalOpen(false);
      setNewAcc({
        code: '',
        nameAr: '',
        nameEn: '',
        type: 'Expense',
        parentCode: '5100',
        normalBalance: 'Debit',
        isPosting: true,
        currency: 'EGP',
        description: '',
      });
    } catch (err: any) {
      alert(`Account error: ${err?.message}`);
    }
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setEditForm({
      nameEn: acc.nameEn,
      nameAr: acc.nameAr,
      description: acc.description || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    try {
      await updateAccount(editingAccount.code, {
        nameEn: editForm.nameEn,
        nameAr: editForm.nameAr,
        description: editForm.description,
      });
      setIsEditModalOpen(false);
      setEditingAccount(null);
    } catch (err: any) {
      alert(`Update error: ${err?.message}`);
    }
  };

  const filtered = accounts.filter((a) => {
    const matchesSearch =
      a.code.includes(searchQuery) ||
      a.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.nameAr.includes(searchQuery);
    const matchesType = selectedType === 'all' || a.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl font-bold tracking-wide flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Network className="w-5 h-5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'دليل الحسابات الموحد (Chart of Accounts)' : 'Chart of Accounts'}</span>
          </h1>
          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {lang === 'ar'
              ? 'شجرة الحسابات المنظمة مع إمكانية تعديل المسميات باللغتين العربية والإنجليزية وضبط صلاحيات الترحيل'
              : 'Standardized 5-tier accounting tree with bilingual label editing and posting controls.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4 text-[#0c1226]" />
          <span>{lang === 'ar' ? 'إضافة حساب جديد' : 'New Account'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className={`p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs border transition-colors ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f21] border-slate-800/80'
        }`}
      >
        <div className="flex items-center gap-2 overflow-x-auto">
          {['all', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1 font-medium rounded transition-colors ${
                selectedType === t
                  ? 'bg-[#147d9f] text-white'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'all' ? (lang === 'ar' ? 'كافة الفئات' : 'All') : t}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث برقم أو اسم الحساب...' : 'Search code or account name...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-1 text-xs rounded focus:outline-none focus:border-[#147d9f] border ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                : 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
            }`}
          />
        </div>
      </div>

      {/* Accounts List Table */}
      <div
        className={`border rounded-lg overflow-hidden transition-colors ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800/80'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`uppercase font-semibold border-b ${
                isLight ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-[#0c142b] text-slate-400 border-slate-800/80'
              }`}
            >
              <tr>
                <th className="py-3 px-4 w-28">{lang === 'ar' ? 'رقم الحساب' : 'Code'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'اسم الحساب بالإنجليزية والعربية' : 'Account Name'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'النوع والتصنيف' : 'Type'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'طبيعة الرصيد' : 'Normal'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'يقبل الترحيل' : 'Posting?'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'الرصيد الدفتري' : 'Current Balance'}</th>
                <th className="py-3 px-4 text-center w-24">{lang === 'ar' ? 'تعديل المسمى' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/40 text-slate-200'}`}>
              {filtered.map((acc) => {
                const isParent = !acc.isPosting;
                return (
                  <tr
                    key={acc.code}
                    className={`transition-colors ${
                      isLight
                        ? isParent
                          ? 'bg-slate-50 font-bold hover:bg-slate-100'
                          : 'hover:bg-slate-50/80'
                        : isParent
                        ? 'bg-slate-900/40 font-bold hover:bg-slate-900/60'
                        : 'hover:bg-slate-900/40'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-[#147d9f]">
                      {acc.code}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        {acc.parentCode && <span className="text-slate-400 font-mono text-[10px]">└─</span>}
                        <div>
                          <div className={isParent ? (isLight ? 'text-slate-900' : 'text-white') : (isLight ? 'text-slate-800' : 'text-slate-300')}>
                            {acc.nameEn}
                          </div>
                          <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{acc.nameAr}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{acc.type}</span>
                    </td>
                    <td className={`py-2.5 px-4 text-center font-mono text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      {acc.normalBalance}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {acc.isPosting ? (
                        <span className="text-emerald-500 font-semibold text-[11px]">Posting</span>
                      ) : (
                        <span className={`text-[10px] uppercase font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          Header
                        </span>
                      )}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {formatMoney(acc.balance)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => openEditModal(acc)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors ${
                          isLight
                            ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-[#147d9f] hover:text-white hover:border-[#147d9f]'
                            : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-[#147d9f] hover:text-white'
                        }`}
                        title={lang === 'ar' ? 'تعديل اسم وبيانات الحساب' : 'Edit Account Name & Details'}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{lang === 'ar' ? 'تعديل' : 'Edit'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT ACCOUNT MODAL */}
      {isEditModalOpen && editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`border w-full max-w-md rounded-lg shadow-2xl p-6 space-y-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f21] border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#147d9f]" />
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {lang === 'ar' ? `تعديل مسمى الحساب (${editingAccount.code})` : `Edit Account Name (${editingAccount.code})`}
                </h2>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'رقم الحساب' : 'Account Code'}</label>
                <input
                  type="text"
                  disabled
                  value={editingAccount.code}
                  className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-500 font-mono font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className={`block mb-1 font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  {lang === 'ar' ? 'اسم الحساب بالإنجليزية (English Name)' : 'Name in English'}
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nameEn}
                  onChange={(e) => setEditForm({ ...editForm, nameEn: e.target.value })}
                  className={`w-full rounded p-2 font-semibold border focus:outline-none focus:border-[#147d9f] ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className={`block mb-1 font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  {lang === 'ar' ? 'اسم الحساب بالعربية (Arabic Name)' : 'Name in Arabic'}
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nameAr}
                  onChange={(e) => setEditForm({ ...editForm, nameAr: e.target.value })}
                  className={`w-full rounded p-2 font-medium border focus:outline-none focus:border-[#147d9f] ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className={`block mb-1 font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  {lang === 'ar' ? 'الوصف والتفاصيل المحاسبية' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                  placeholder={lang === 'ar' ? 'وصف طبيعة حركة الحساب...' : 'Account description or purpose...'}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className={`px-4 py-2 text-xs rounded ${isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:text-white'}`}
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-xs"
                >
                  {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ACCOUNT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`border w-full max-w-md rounded-lg shadow-2xl p-6 space-y-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f21] border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {lang === 'ar' ? 'إضافة حساب جديد إلى دليل الحسابات' : 'Add New Account to Chart of Accounts'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'كود الحساب' : 'Account Code'}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5170"
                    value={newAcc.code}
                    onChange={(e) => setNewAcc({ ...newAcc, code: e.target.value })}
                    className={`w-full rounded p-2 font-mono font-bold border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'نوع الحساب' : 'Account Type'}</label>
                  <select
                    value={newAcc.type}
                    onChange={(e) => {
                      const t = e.target.value as AccountType;
                      const norm: NormalBalance = t === 'Asset' || t === 'Expense' ? 'Debit' : 'Credit';
                      setNewAcc({ ...newAcc, type: t, normalBalance: norm });
                    }}
                    className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  >
                    <option value="Asset">Asset (أصول)</option>
                    <option value="Liability">Liability (التزامات)</option>
                    <option value="Equity">Equity (حقوق ملكية)</option>
                    <option value="Revenue">Revenue (إيرادات)</option>
                    <option value="Expense">Expense (مصروفات)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'اسم الحساب بالإنجليزية' : 'Name in English'}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunset Boat Snacks & Refreshments"
                  value={newAcc.nameEn}
                  onChange={(e) => setNewAcc({ ...newAcc, nameEn: e.target.value })}
                  className={`w-full rounded p-2 font-semibold border focus:outline-none focus:border-[#147d9f] ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'اسم الحساب بالعربية' : 'Name in Arabic'}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ضيافة ومشروبات رحلات الغروب"
                  value={newAcc.nameAr}
                  onChange={(e) => setNewAcc({ ...newAcc, nameAr: e.target.value })}
                  className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'الحساب الأب / الرئيسي' : 'Parent Account'}</label>
                  <select
                    value={newAcc.parentCode}
                    onChange={(e) => setNewAcc({ ...newAcc, parentCode: e.target.value })}
                    className={`w-full rounded p-2 font-mono border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  >
                    <option value="">-- No Parent (Root) --</option>
                    {accounts.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} - {a.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'طبيعة الرصيد' : 'Normal Balance'}</label>
                  <select
                    value={newAcc.normalBalance}
                    onChange={(e) => setNewAcc({ ...newAcc, normalBalance: e.target.value as any })}
                    className={`w-full rounded p-2 font-mono border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  >
                    <option value="Debit">Debit (مدين)</option>
                    <option value="Credit">Credit (دائن)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 text-xs rounded ${isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:text-white'}`}
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-xs"
                >
                  {lang === 'ar' ? 'حفظ الحساب' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
