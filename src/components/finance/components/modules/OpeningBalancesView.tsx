import React, { useState, useMemo } from 'react';
import { useErp } from '../../context/ErpContext';
import {
  Landmark,
  Plus,
  Save,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  Lock,
  Calendar,
  Layers,
  ArrowRightLeft,
  Users,
  Building2,
  Wallet,
  Ship,
  FileText,
  Search,
  Trash2,
  Edit,
  Eye,
  Info,
} from 'lucide-react';
import { OpeningBalanceBatch, OpeningBalanceLine } from '../../types/erp';

export const OpeningBalancesView: React.FC = () => {
  const {
    openingBalances,
    accounts,
    customers,
    suppliers,
    fixedAssets,
    createOpeningBalanceBatch,
    updateOpeningBalanceBatch,
    postOpeningBalanceBatch,
    importOpeningBalances,
    formatMoney,
    lang,
    theme,
  } = useErp();

  const isLight = theme === 'light';
  const isAr = lang === 'ar';

  // Active batch selection
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    openingBalances.length > 0 ? openingBalances[0].id : ''
  );
  const activeBatch = openingBalances.find((b) => b.id === selectedBatchId) || openingBalances[0];

  const [activeTab, setActiveTab] = useState<'all' | 'customers' | 'suppliers' | 'cash_banks' | 'fixed_assets'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Editable lines state
  const [lines, setLines] = useState<OpeningBalanceLine[]>(activeBatch?.lines || []);

  // Sync lines when activeBatch changes
  React.useEffect(() => {
    if (activeBatch) {
      setLines(activeBatch.lines || []);
      setSelectedBatchId(activeBatch.id);
    }
  }, [activeBatch?.id]);

  // Calculations
  const totalDebit = useMemo(() => lines.reduce((s, l) => s + (Number(l.debit) || 0), 0), [lines]);
  const totalCredit = useMemo(() => lines.reduce((s, l) => s + (Number(l.credit) || 0), 0), [lines]);
  const diff = Math.abs(totalDebit - totalCredit);
  const isBalanced = diff < 0.01;

  // Filter lines by tab and search
  const filteredLines = useMemo(() => {
    return lines.filter((l) => {
      // Tab filter
      if (activeTab === 'customers' && !l.accountCode.startsWith('112')) return false;
      if (activeTab === 'suppliers' && !l.accountCode.startsWith('211')) return false;
      if (activeTab === 'cash_banks' && !l.accountCode.startsWith('111')) return false;
      if (activeTab === 'fixed_assets' && !l.accountCode.startsWith('12')) return false;

      // Search filter
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        l.accountCode.toLowerCase().includes(term) ||
        l.accountNameAr.toLowerCase().includes(term) ||
        l.accountNameEn.toLowerCase().includes(term) ||
        (l.subledgerName || '').toLowerCase().includes(term) ||
        (l.description || '').toLowerCase().includes(term)
      );
    });
  }, [lines, activeTab, searchTerm]);

  // Subledger summary numbers
  const subledgerStats = useMemo(() => {
    const custTotal = lines.filter((l) => l.accountCode.startsWith('112')).reduce((s, l) => s + (l.debit - l.credit), 0);
    const suppTotal = lines.filter((l) => l.accountCode.startsWith('211')).reduce((s, l) => s + (l.credit - l.debit), 0);
    const cashTotal = lines.filter((l) => l.accountCode.startsWith('111')).reduce((s, l) => s + (l.debit - l.credit), 0);
    const assetCost = lines.filter((l) => l.accountCode === '1210' || l.accountCode.startsWith('121')).reduce((s, l) => s + l.debit, 0);
    const assetAccDep = lines.filter((l) => l.accountCode === '1220' || l.accountCode.startsWith('122')).reduce((s, l) => s + l.credit, 0);
    const assetNBV = assetCost - assetAccDep;

    return { custTotal, suppTotal, cashTotal, assetCost, assetAccDep, assetNBV };
  }, [lines]);

  const handleAddLine = () => {
    const newLine: OpeningBalanceLine = {
      id: `obl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      accountCode: '1111',
      accountNameAr: 'الخزينة النقدية الرئيسية',
      accountNameEn: 'Main Cash Vault',
      debit: 0,
      credit: 0,
      description: isAr ? 'رصيد افتتاحي' : 'Opening balance',
    };
    setLines([...lines, newLine]);
    setIsEditing(true);
  };

  const handleUpdateLine = (id: string, field: keyof OpeningBalanceLine, val: any) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: val };
        if (field === 'accountCode') {
          const acc = accounts.find((a) => a.code === val);
          if (acc) {
            updated.accountNameAr = acc.nameAr;
            updated.accountNameEn = acc.nameEn;
          }
        }
        return updated;
      })
    );
  };

  const handleDeleteLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSaveDraft = async () => {
    try {
      setActionError('');
      setActionSuccess('');
      if (!activeBatch) return;
      await updateOpeningBalanceBatch(activeBatch.id, {
        lines,
      });
      setIsEditing(false);
      setActionSuccess(isAr ? 'تم حفظ التعديلات بنجاح' : 'Opening balance draft saved successfully');
    } catch (err: any) {
      setActionError(err.message || 'Error saving draft');
    }
  };

  const handlePostBatch = async () => {
    if (!activeBatch) return;
    if (!isBalanced) {
      setActionError(isAr ? 'لا يمكن الترحيل لأن القيد غير متزن' : 'Cannot post: Debits and Credits must balance');
      return;
    }
    const confirmMsg = isAr
      ? `هل أنت متأكد من ترحيل الأرصدة الافتتاحية للسنة ${activeBatch.fiscalYear}؟\nسيتم إنشاء قيد اليومية الافتتاحي وتحديث أرصدة دفتر الأستاذ نهائياً.`
      : `Are you sure you want to approve and post opening balances for fiscal year ${activeBatch.fiscalYear}? This generates the permanent JV-OPEN journal entry.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setActionError('');
      setActionSuccess('');
      // Save current lines first
      if (isEditing) {
        await updateOpeningBalanceBatch(activeBatch.id, { lines });
      }
      await postOpeningBalanceBatch(activeBatch.id);
      setIsEditing(false);
      setActionSuccess(isAr ? 'تم اعتماد وترحيل الأرصدة الافتتاحية بنجاح إلى دفتر الأستاذ!' : 'Opening balances successfully approved and posted to General Ledger!');
    } catch (err: any) {
      setActionError(err.message || 'Error posting batch');
    }
  };

  // Export CSV template
  const handleExportCSV = () => {
    const headers = ['AccountCode', 'AccountNameEn', 'AccountNameAr', 'Debit', 'Credit', 'Subledger', 'CostCenter', 'Notes'];
    const rows = lines.map((l) => [
      l.accountCode,
      `"${l.accountNameEn.replace(/"/g, '""')}"`,
      `"${l.accountNameAr.replace(/"/g, '""')}"`,
      l.debit,
      l.credit,
      `"${(l.subledgerName || '').replace(/"/g, '""')}"`,
      `"${(l.costCenter || '').replace(/"/g, '""')}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DUCK_Opening_Balances_${activeBatch?.fiscalYear || 2026}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import CSV text
  const handleImportCSV = async () => {
    try {
      setImportError('');
      if (!importText.trim()) {
        setImportError(isAr ? 'الرجاء إدخال بيانات CSV' : 'Please paste CSV data');
        return;
      }
      const rawRows = importText.trim().split('\n');
      const parsedRows: any[] = [];

      for (let i = 0; i < rawRows.length; i++) {
        const lineStr = rawRows[i].trim();
        if (!lineStr) continue;
        // Skip header if present
        if (i === 0 && lineStr.toLowerCase().includes('accountcode')) continue;

        const cols = lineStr.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 4) {
          const accCode = cols[0];
          const acc = accounts.find((a) => a.code === accCode);
          parsedRows.push({
            accountCode: accCode,
            accountNameAr: acc?.nameAr || cols[2] || 'حساب',
            accountNameEn: acc?.nameEn || cols[1] || 'Account',
            debit: parseFloat(cols[3]) || 0,
            credit: parseFloat(cols[4]) || 0,
            subledgerName: cols[5] || undefined,
            costCenter: cols[6] || undefined,
            description: cols[7] || (isAr ? 'استيراد رصيد افتتاحي' : 'Imported opening balance'),
          });
        }
      }

      if (parsedRows.length === 0) {
        setImportError(isAr ? 'لم يتم العثور على أسطر صالحة للاستيراد' : 'No valid lines parsed');
        return;
      }

      if (!activeBatch) return;
      await importOpeningBalances(activeBatch.id, parsedRows);
      setShowImportModal(false);
      setImportText('');
      setActionSuccess(isAr ? `تم استيراد ${parsedRows.length} رصيد حساب بنجاح` : `Imported ${parsedRows.length} account balances successfully`);
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    }
  };

  const isPosted = activeBatch?.status === 'Posted' || activeBatch?.status === 'posted';

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#147d9f]/20 to-[#fdfb45]/20 text-[#147d9f] border border-[#147d9f]/30">
              <Landmark className="w-6 h-6 text-[#147d9f]" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isAr ? 'نظام الأرصدة الافتتاحية' : 'Opening Balances Management'}
              </h1>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isAr
                  ? 'إعداد قيد بداية التشغيل، مطابقة الأرصدة المدنية والدائنة، وربط دفاتر الأستاذ المساعدة'
                  : 'System launch balances setup, subledger reconciliations, and opening journal voucher'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              isLight
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
            title={isAr ? 'تصدير كـ CSV' : 'Export as CSV'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isAr ? 'تصدير إكسيل/CSV' : 'Export CSV'}</span>
          </button>

          {!isPosted && (
            <>
              <button
                onClick={() => setShowImportModal(true)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isAr ? 'استيراد شيت إكسيل' : 'Import CSV'}</span>
              </button>

              <button
                onClick={handleAddLine}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-[#147d9f]/20 text-[#147d9f] border border-[#147d9f]/40 hover:bg-[#147d9f]/30 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'إضافة حساب' : 'Add Line'}</span>
              </button>

              <button
                onClick={handleSaveDraft}
                className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                  isLight
                    ? 'bg-slate-800 text-white hover:bg-slate-700'
                    : 'bg-slate-700 text-white hover:bg-slate-600'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isAr ? 'حفظ المسودة' : 'Save Draft'}</span>
              </button>

              <button
                onClick={handlePostBatch}
                disabled={!isBalanced || lines.length === 0}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all ${
                  isBalanced && lines.length > 0
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20'
                    : 'bg-slate-700/50 text-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAr ? 'اعتماد وترحيل للأستاذ العام' : 'Approve & Post to GL'}</span>
              </button>
            </>
          )}

          {isPosted && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>{isAr ? `معتمد ومرحل (${activeBatch?.journalNumber})` : `Posted (${activeBatch?.journalNumber})`}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-400/60 hover:text-emerald-400 font-bold">×</button>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-rose-400/60 hover:text-rose-400 font-bold">×</button>
        </div>
      )}

      {/* Fiscal Setup & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Fiscal Year & Period Card */}
        <div
          className={`p-4 rounded-xl border transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172e] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#147d9f]" />
              {isAr ? 'السنة المالية وبداية العمل' : 'Fiscal Year & Launch'}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isPosted
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {isPosted ? (isAr ? 'مرحل ومقفل' : 'Posted') : isAr ? 'مسودة قيد المراجعة' : 'Draft / Review'}
            </span>
          </div>
          <div className="text-lg font-bold text-[#147d9f]">
            {activeBatch?.fiscalYear || 2026} ({activeBatch?.currency || 'EGP'})
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{isAr ? 'تاريخ القيد:' : 'Entry Date:'} {activeBatch?.openingDate || '2026-01-01'}</span>
            <span className="font-mono text-[10px] text-slate-500">{activeBatch?.batchNumber}</span>
          </div>
        </div>

        {/* Debits Total */}
        <div
          className={`p-4 rounded-xl border transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172e] border-slate-800'
          }`}
        >
          <div className="text-xs text-slate-400 mb-1">
            {isAr ? 'إجمالي المدين (Debit)' : 'Total Debits'}
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {formatMoney(totalDebit)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {lines.filter((l) => l.debit > 0).length} {isAr ? 'حساب مدين' : 'debit lines'}
          </div>
        </div>

        {/* Credits Total */}
        <div
          className={`p-4 rounded-xl border transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172e] border-slate-800'
          }`}
        >
          <div className="text-xs text-slate-400 mb-1">
            {isAr ? 'إجمالي الدائن (Credit)' : 'Total Credits'}
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            {formatMoney(totalCredit)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {lines.filter((l) => l.credit > 0).length} {isAr ? 'حساب دائن' : 'credit lines'}
          </div>
        </div>

        {/* Double-Entry Balancing Verification */}
        <div
          className={`p-4 rounded-xl border transition-colors ${
            isBalanced
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-rose-500/10 border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-slate-300">
              {isAr ? 'حالة التوازن المحاسبي' : 'Accounting Balance'}
            </span>
            {isBalanced ? (
              <span className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isAr ? 'متزن 100%' : 'Balanced 100%'}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400 font-bold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                {isAr ? 'غير متزن' : 'Unbalanced'}
              </span>
            )}
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {isBalanced
              ? (isAr ? '0.00 ج.م فارق' : '0.00 EGP Diff')
              : `${formatMoney(diff)} ${isAr ? 'فارق' : 'Difference'}`}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {isBalanced
              ? (isAr ? 'جاهز للاعتماد والترحيل' : 'Ready for approval & posting')
              : (isAr ? 'المدين يجب أن يتطابق مع الدائن بدقة' : 'Debits must strictly equal Credits')}
          </div>
        </div>
      </div>

      {/* Subledger Summaries Quick Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('customers')}
          className={`p-3 rounded-xl border text-start transition-all ${
            activeTab === 'customers'
              ? 'border-[#147d9f] bg-[#147d9f]/10 shadow-sm'
              : isLight
              ? 'bg-white border-slate-200 hover:border-slate-300'
              : 'bg-[#0f172e] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>{isAr ? 'أرصدة العملاء (1121)' : 'Customers Ledger'}</span>
          </div>
          <div className="text-sm font-bold font-mono text-slate-200">
            {formatMoney(subledgerStats.custTotal)}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`p-3 rounded-xl border text-start transition-all ${
            activeTab === 'suppliers'
              ? 'border-[#147d9f] bg-[#147d9f]/10 shadow-sm'
              : isLight
              ? 'bg-white border-slate-200 hover:border-slate-300'
              : 'bg-[#0f172e] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'أرصدة الموردين (2111)' : 'Suppliers Ledger'}</span>
          </div>
          <div className="text-sm font-bold font-mono text-slate-200">
            {formatMoney(subledgerStats.suppTotal)}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('cash_banks')}
          className={`p-3 rounded-xl border text-start transition-all ${
            activeTab === 'cash_banks'
              ? 'border-[#147d9f] bg-[#147d9f]/10 shadow-sm'
              : isLight
              ? 'bg-white border-slate-200 hover:border-slate-300'
              : 'bg-[#0f172e] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isAr ? 'الخزينة والبنوك والمحافظ (111x)' : 'Cash & Banks'}</span>
          </div>
          <div className="text-sm font-bold font-mono text-slate-200">
            {formatMoney(subledgerStats.cashTotal)}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('fixed_assets')}
          className={`p-3 rounded-xl border text-start transition-all ${
            activeTab === 'fixed_assets'
              ? 'border-[#147d9f] bg-[#147d9f]/10 shadow-sm'
              : isLight
              ? 'bg-white border-slate-200 hover:border-slate-300'
              : 'bg-[#0f172e] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Ship className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isAr ? 'صافي الأصول والأسطول (12xx)' : 'Fixed Assets NBV'}</span>
          </div>
          <div className="text-sm font-bold font-mono text-slate-200">
            {formatMoney(subledgerStats.assetNBV)}
          </div>
        </button>
      </div>

      {/* Main Table Container */}
      <div
        className={`rounded-xl border overflow-hidden transition-colors ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172e] border-slate-800'
        }`}
      >
        {/* Navigation Tabs & Search Toolbar */}
        <div
          className={`p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0c142b] border-slate-800/80'
          }`}
        >
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', labelAr: 'كل الحسابات', labelEn: 'All Accounts', count: lines.length },
              {
                id: 'customers',
                labelAr: 'دفتر العملاء',
                labelEn: 'Customers',
                count: lines.filter((l) => l.accountCode.startsWith('112')).length,
              },
              {
                id: 'suppliers',
                labelAr: 'دفتر الموردين',
                labelEn: 'Suppliers',
                count: lines.filter((l) => l.accountCode.startsWith('211')).length,
              },
              {
                id: 'cash_banks',
                labelAr: 'الخزينة والبنوك',
                labelEn: 'Cash & Banks',
                count: lines.filter((l) => l.accountCode.startsWith('111')).length,
              },
              {
                id: 'fixed_assets',
                labelAr: 'سجل الأصول',
                labelEn: 'Fixed Assets',
                count: lines.filter((l) => l.accountCode.startsWith('12')).length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#147d9f] text-white shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:bg-slate-200'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{isAr ? tab.labelAr : tab.labelEn}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-700/50 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isAr ? 'بحث برقم الحساب أو الاسم...' : 'Search code or name...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ps-9 pe-3 py-1.5 rounded-lg text-xs border focus:outline-none transition-colors ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-[#147d9f]'
                  : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-[#147d9f]'
              }`}
            />
          </div>
        </div>

        {/* Lines Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr
                className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                  isLight ? 'bg-slate-100/70 border-slate-200 text-slate-600' : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <th className="py-3 px-4 text-start">#</th>
                <th className="py-3 px-4 text-start">{isAr ? 'رمز الحساب' : 'Account Code'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'اسم الحساب' : 'Account Name'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'الحساب المساعد / الجهة' : 'Subledger / Party'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'مركز التكلفة / الموقع' : 'Cost Center / Location'}</th>
                <th className="py-3 px-4 text-end text-emerald-400">{isAr ? 'مدين (Debit)' : 'Debit'}</th>
                <th className="py-3 px-4 text-end text-cyan-400">{isAr ? 'دائن (Credit)' : 'Credit'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'ملاحظات وتفاصيل' : 'Notes'}</th>
                {!isPosted && <th className="py-3 px-4 text-center">{isAr ? 'حذف' : 'Del'}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredLines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                    {isAr ? 'لا توجد أسطر مطابقة للبحث أو التبويب الحالي' : 'No lines match the current filter'}
                  </td>
                </tr>
              ) : (
                filteredLines.map((line, idx) => (
                  <tr
                    key={line.id}
                    className={`transition-colors ${
                      isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Account Code */}
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-200">
                      {!isPosted && isEditing ? (
                        <select
                          value={line.accountCode}
                          onChange={(e) => handleUpdateLine(line.id, 'accountCode', e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.code} value={acc.code}>
                              {acc.code} - {isAr ? acc.nameAr : acc.nameEn}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[#147d9f] font-bold">
                          {line.accountCode}
                        </span>
                      )}
                    </td>

                    {/* Account Name */}
                    <td className="py-2.5 px-4 font-medium text-slate-200">
                      <div>{isAr ? line.accountNameAr : line.accountNameEn}</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        {isAr ? line.accountNameEn : line.accountNameAr}
                      </div>
                    </td>

                    {/* Subledger Party */}
                    <td className="py-2.5 px-4 text-slate-300">
                      {!isPosted && isEditing ? (
                        <input
                          type="text"
                          value={line.subledgerName || ''}
                          onChange={(e) => handleUpdateLine(line.id, 'subledgerName', e.target.value)}
                          placeholder={isAr ? 'اسم العميل / المورد' : 'Subledger party'}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-36"
                        />
                      ) : (
                        line.subledgerName ? (
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium text-[11px]">
                            {line.subledgerName}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )
                      )}
                    </td>

                    {/* Cost Center */}
                    <td className="py-2.5 px-4 text-slate-400">
                      {line.costCenter || <span className="text-slate-600">—</span>}
                    </td>

                    {/* Debit */}
                    <td className="py-2.5 px-4 text-end font-mono">
                      {!isPosted && isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={line.debit || ''}
                          onChange={(e) => handleUpdateLine(line.id, 'debit', parseFloat(e.target.value) || 0)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-emerald-400 text-end w-28 focus:outline-none"
                        />
                      ) : (
                        <span className={line.debit > 0 ? 'text-emerald-400 font-semibold' : 'text-slate-600'}>
                          {line.debit > 0 ? formatMoney(line.debit) : '—'}
                        </span>
                      )}
                    </td>

                    {/* Credit */}
                    <td className="py-2.5 px-4 text-end font-mono">
                      {!isPosted && isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={line.credit || ''}
                          onChange={(e) => handleUpdateLine(line.id, 'credit', parseFloat(e.target.value) || 0)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-400 text-end w-28 focus:outline-none"
                        />
                      ) : (
                        <span className={line.credit > 0 ? 'text-cyan-400 font-semibold' : 'text-slate-600'}>
                          {line.credit > 0 ? formatMoney(line.credit) : '—'}
                        </span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                      {!isPosted && isEditing ? (
                        <input
                          type="text"
                          value={line.description || ''}
                          onChange={(e) => handleUpdateLine(line.id, 'description', e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-full"
                        />
                      ) : (
                        line.description || <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    {!isPosted && (
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteLine(line.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                          title={isAr ? 'حذف السطر' : 'Delete line'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {/* Totals Footer */}
            <tfoot>
              <tr
                className={`border-t font-bold font-mono text-xs ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-700'
                }`}
              >
                <td colSpan={5} className="py-3 px-4 text-end font-sans">
                  {isAr ? 'الإجمالي العام للأرصدة الافتتاحية:' : 'Total Opening Balances:'}
                </td>
                <td className="py-3 px-4 text-end text-emerald-400">
                  {formatMoney(totalDebit)}
                </td>
                <td className="py-3 px-4 text-end text-cyan-400">
                  {formatMoney(totalCredit)}
                </td>
                <td colSpan={!isPosted ? 2 : 1} className="py-3 px-4 text-start font-sans">
                  {isBalanced ? (
                    <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isAr ? 'متطابق 100%' : 'Balanced'}
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {isAr ? `فارق: ${formatMoney(diff)}` : `Diff: ${formatMoney(diff)}`}
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl border p-6 space-y-4 shadow-2xl ${
              isLight ? 'bg-white border-slate-300' : 'bg-[#0f172e] border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#147d9f]" />
                <h3 className="text-lg font-bold text-white">
                  {isAr ? 'استيراد الأرصدة الافتتاحية من إكسيل / CSV' : 'Import Opening Balances from CSV'}
                </h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p>
                {isAr
                  ? 'الصق بيانات الـ CSV بالأعمدة التالية: رمز الحساب، الاسم بالإنجليزية، الاسم بالعربية، مدين، دائن، الحساب المساعد، مركز التكلفة، ملاحظات'
                  : 'Paste CSV rows with columns: AccountCode, NameEn, NameAr, Debit, Credit, Subledger, CostCenter, Notes'}
              </p>
              <p className="font-mono text-[11px] text-slate-500">
                Example: 1111,Main Vault,الخزينة الرئيسية,50000,0,,Aswan,Opening cash
              </p>
            </div>

            {importError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {importError}
              </div>
            )}

            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="1111,Main Cash,الخزينة الرئيسية,50000,0,,,Opening balance&#10;1112,CIB Bank,بنك CIB,120000,0,,,Opening bank"
              className={`w-full p-3 rounded-xl border text-xs font-mono focus:outline-none ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
              }`}
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleImportCSV}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#147d9f] text-white hover:bg-[#116986] shadow-sm"
              >
                {isAr ? 'بدء الاستيراد والمطابقة' : 'Parse & Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
