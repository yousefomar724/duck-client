import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { Wallet, ArrowRightLeft, Plus, CheckCircle2, X, RefreshCw, CreditCard } from 'lucide-react';

export const CashAndBanksView: React.FC = () => {
  const { accounts, createJournal, formatMoney, lang, t } = useErp();

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    fromAccountCode: '1111',
    toAccountCode: '1112',
    amount: 10000,
    reference: 'BANK-DEP-01',
    notes: 'Cash on hand deposited to CIB commercial account',
  });

  const liquidAccounts = accounts.filter(
    (a) => ['1111', '1112', '1113', '1114', '1115'].includes(a.code)
  );

  const totalLiquidity = liquidAccounts.reduce((s, a) => s + a.balance, 0);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferData.fromAccountCode === transferData.toAccountCode) {
      alert('Source and destination accounts must be different.');
      return;
    }
    if (transferData.amount <= 0) {
      alert('Transfer amount must be greater than zero.');
      return;
    }

    try {
      const fromAcc = accounts.find((a) => a.code === transferData.fromAccountCode);
      const toAcc = accounts.find((a) => a.code === transferData.toAccountCode);

      const payload = {
        journalNumber: `JV-TRF-${Date.now().toString().slice(-4)}`,
        date: new Date().toISOString().split('T')[0],
        periodId: 'p-2026-11',
        sourceDocument: 'BankTransfer',
        sourceDocumentNumber: transferData.reference || `TRF-${Date.now().toString().slice(-4)}`,
        description: `Internal Fund Transfer from ${fromAcc?.nameEn} to ${toAcc?.nameEn}: ${transferData.notes}`,
        lines: [
          {
            id: `trf-dr-${Date.now()}`,
            accountCode: transferData.toAccountCode,
            accountNameAr: toAcc?.nameAr || '',
            accountNameEn: toAcc?.nameEn || '',
            debit: transferData.amount,
            credit: 0,
            description: `Deposit to ${toAcc?.nameEn}`,
          },
          {
            id: `trf-cr-${Date.now()}`,
            accountCode: transferData.fromAccountCode,
            accountNameAr: fromAcc?.nameAr || '',
            accountNameEn: fromAcc?.nameEn || '',
            debit: 0,
            credit: transferData.amount,
            description: `Withdrawal from ${fromAcc?.nameEn}`,
          },
        ],
        totalDebit: transferData.amount,
        totalCredit: transferData.amount,
        status: 'posted',
      };

      await createJournal(payload);
      setIsTransferModalOpen(false);
    } catch (err: any) {
      alert(`Transfer error: ${err?.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'الخزينة النقدية والحسابات البنكية والمحافظ' : 'Cash & Bank Accounts'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'متابعة السيولة النقدية الحية، حسابات بنك CIB، فودافون كاش وإنستاباي مع التحويل البيني'
              : 'Real-time liquidity across cash on hand, CIB bank, Vodafone Cash, and InstaPay accounts.'}
          </p>
        </div>

        <button
          onClick={() => setIsTransferModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-sm transition-colors"
        >
          <ArrowRightLeft className="w-4 h-4 text-[#0c1226]" />
          <span>{lang === 'ar' ? 'تحويل بين الخزينة والحسابات' : 'Internal Funds Transfer'}</span>
        </button>
      </div>

      {/* Total Liquidity Banner */}
      <div className="bg-[#0c142b] border border-slate-800 p-4 rounded-lg flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400">{lang === 'ar' ? 'إجمالي السيولة النقدية المتاحة' : 'Total Liquid Funds'}</span>
          <div className="text-2xl font-bold font-mono text-white mt-0.5">{formatMoney(totalLiquidity)}</div>
        </div>
        <div className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded border border-emerald-800">
          Reconciled with General Ledger
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {liquidAccounts.map((acc) => (
          <div key={acc.code} className="bg-[#0a0f21] border border-slate-800/80 p-5 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#147d9f]">{acc.code}</span>
              <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                {acc.currency}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">{lang === 'ar' ? acc.nameAr : acc.nameEn}</h3>
              <p className="text-[11px] text-slate-400">{lang === 'ar' ? acc.nameEn : acc.nameAr}</p>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">{lang === 'ar' ? 'الرصيد الدفتري:' : 'Book Balance:'}</span>
              <span className="text-lg font-bold font-mono text-[#fdfb45]">{formatMoney(acc.balance)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* INTERNAL TRANSFER MODAL */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0a0f21] border border-slate-700 w-full max-w-md rounded-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#fdfb45]" />
                <span>{lang === 'ar' ? 'تحويل مالي بين الحسابات' : 'Internal Account Transfer Voucher'}</span>
              </h2>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'من حساب (المرسل)' : 'From Account (Source)'}</label>
                <select
                  value={transferData.fromAccountCode}
                  onChange={(e) => setTransferData({ ...transferData, fromAccountCode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100 font-mono"
                >
                  {liquidAccounts.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} - {a.nameEn} (Bal: {a.balance} EGP)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'إلى حساب (المستلم)' : 'To Account (Destination)'}</label>
                <select
                  value={transferData.toAccountCode}
                  onChange={(e) => setTransferData({ ...transferData, toAccountCode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100 font-mono"
                >
                  {liquidAccounts.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} - {a.nameEn} (Bal: {a.balance} EGP)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'مبلغ التحويل (ج.م)' : 'Transfer Amount (EGP)'}</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({ ...transferData, amount: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-[#fdfb45] font-mono font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'رقم الإيداع أو المرجع' : 'Deposit Slip / Reference'}</label>
                <input
                  type="text"
                  placeholder="e.g. CIB-DEP-9921"
                  value={transferData.reference}
                  onChange={(e) => setTransferData({ ...transferData, reference: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'البيان والملاحظات' : 'Notes'}</label>
                <input
                  type="text"
                  value={transferData.notes}
                  onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-sm"
                >
                  {lang === 'ar' ? 'تنفيذ التحويل وترحيل القيد' : 'Post Transfer Journal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
