import React, { useState, useMemo } from 'react';
import { useErp } from '../../context/ErpContext';
import { FixedAsset, AssetCategoryItem, DepreciationRunItem } from '../../types/erp';
import {
  Ship,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sliders,
  DollarSign,
  Calendar,
  Layers,
  FileSpreadsheet,
  Trash2,
  Edit,
  ArrowRightLeft,
  Info,
  Clock,
  ShieldCheck,
  Check,
  TrendingDown,
  Building2,
  Tag,
  Boxes,
} from 'lucide-react';

export const FixedAssetsView: React.FC = () => {
  const {
    fixedAssets,
    assetCategories,
    depreciationRuns,
    accounts,
    createFixedAsset,
    updateFixedAsset,
    createAssetCategory,
    updateAssetCategory,
    previewDepreciation,
    executeMonthlyDepreciation,
    disposeFixedAsset,
    fetchAssetMovementReport,
    formatMoney,
    lang,
    theme,
  } = useErp();

  const isLight = theme === 'light';
  const isAr = lang === 'ar';

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'register' | 'depreciation_run' | 'categories' | 'movement_report'>('register');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  const [showDisposalModal, setShowDisposalModal] = useState(false);
  const [disposingAsset, setDisposingAsset] = useState<FixedAsset | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetCategoryItem | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Asset Form fields
  const [assetForm, setAssetForm] = useState<Partial<FixedAsset>>({
    assetId: '',
    nameAr: '',
    nameEn: '',
    category: 'Kayaks',
    trackingMethod: 'Individual',
    quantity: 1,
    unitCost: 15000,
    totalAcquisitionCost: 15000,
    acquisitionCost: 15000,
    purchaseDate: new Date().toISOString().split('T')[0],
    inServiceDate: new Date().toISOString().split('T')[0],
    usefulLifeMonths: 60,
    depreciationMethod: 'Straight Line',
    residualValue: 0,
    status: 'Active',
    location: 'Aswan - Elephantine Island',
    costCenter: 'Aswan Hub',
    custodian: 'Captain Ali (Aswan Lead)',
    responsibleEmployee: 'Captain Ali',
    serialNumber: '',
    isOpeningBalance: false,
    assetAccountCode: '1210',
    depreciationAccountCode: '5500',
    accumulatedDepreciationAccountCode: '1220',
  });

  // Disposal Form fields
  const [disposalForm, setDisposalForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Sale' as 'Sale' | 'Scrap' | 'Loss',
    saleProceeds: 0,
    receivingAccountCode: '1111',
    reason: '',
  });

  // Category Form fields
  const [categoryForm, setCategoryForm] = useState<Partial<AssetCategoryItem>>({
    code: '',
    nameAr: '',
    nameEn: '',
    defaultUsefulLifeMonths: 60,
    defaultDepreciationMethod: 'Straight Line',
    assetAccountCode: '1210',
    depreciationAccountCode: '5500',
    accDepreciationAccountCode: '1220',
    active: true,
  });

  // Monthly Depreciation Run state
  const [depYear, setDepYear] = useState<number>(new Date().getFullYear());
  const [depMonth, setDepMonth] = useState<number>(new Date().getMonth() + 1);
  const [depPreview, setDepPreview] = useState<DepreciationRunItem[]>([]);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [executingDep, setExecutingDep] = useState<boolean>(false);

  // Movement Report state
  const [movementReport, setMovementReport] = useState<any[]>([]);
  const [loadingMovement, setLoadingMovement] = useState<boolean>(false);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totalAcqCost = 0;
    let totalAccDep = 0;
    let totalNBV = 0;
    let totalQty = 0;
    let activeCount = 0;

    for (const a of fixedAssets) {
      const cost = a.totalAcquisitionCost || a.acquisitionCost || 0;
      totalAcqCost += cost;
      totalAccDep += a.accumulatedDepreciation || 0;
      totalNBV += a.netBookValue || 0;
      totalQty += a.quantity || 1;
      if (a.status === 'Active') activeCount++;
    }

    return { totalAcqCost, totalAccDep, totalNBV, totalQty, activeCount };
  }, [fixedAssets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return fixedAssets.filter((a) => {
      if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;

      if (!searchQuery) return true;
      const term = searchQuery.toLowerCase();
      return (
        a.assetId.toLowerCase().includes(term) ||
        a.nameEn.toLowerCase().includes(term) ||
        a.nameAr.toLowerCase().includes(term) ||
        (a.custodian || '').toLowerCase().includes(term) ||
        (a.location || '').toLowerCase().includes(term) ||
        (a.serialNumber || '').toLowerCase().includes(term)
      );
    });
  }, [fixedAssets, categoryFilter, statusFilter, searchQuery]);

  // Load Depreciation Preview when tab or year/month changes
  const loadDepreciationPreview = async () => {
    try {
      setLoadingPreview(true);
      const items = await previewDepreciation(depYear, depMonth);
      setDepPreview(items);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error loading depreciation preview' });
    } finally {
      setLoadingPreview(false);
    }
  };

  // Load Movement Report
  const loadMovementReport = async () => {
    try {
      setLoadingMovement(true);
      const rep = await fetchAssetMovementReport();
      setMovementReport(rep);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error loading movement report' });
    } finally {
      setLoadingMovement(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'depreciation_run') {
      loadDepreciationPreview();
    } else if (activeTab === 'movement_report') {
      loadMovementReport();
    }
  }, [activeTab, depYear, depMonth]);

  // Execute Depreciation Run
  const handleExecuteDepreciation = async () => {
    const confirmMsg = isAr
      ? `هل أنت متأكد من تنفيذ وترحيل إهلاك الأصول لشهر ${depMonth} / ${depYear}؟\nسيتم إنشاء قيد اليومية (JV-DEP-${depYear}-${String(depMonth).padStart(2, '0')}) وتحديث صافي القيمة الدفترية للأصول.`
      : `Are you sure you want to execute and post monthly depreciation for ${depYear}-${String(depMonth).padStart(2, '0')}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setExecutingDep(true);
      const res = await executeMonthlyDepreciation(depYear, depMonth);
      setNotification({
        type: 'success',
        text: isAr
          ? `تم تنفيذ قيد الإهلاك بنجاح (${res.journal.journalNumber}) بإجمالي ${formatMoney(res.totalDepreciation)} على ${res.count} أصل!`
          : `Monthly depreciation executed (${res.journal.journalNumber}) for ${formatMoney(res.totalDepreciation)} across ${res.count} assets!`,
      });
      await loadDepreciationPreview();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error executing depreciation' });
    } finally {
      setExecutingDep(false);
    }
  };

  // Handle open Add Asset
  const handleOpenAddAsset = () => {
    setEditingAsset(null);
    const nextCode = `DUCK-AST-${String(fixedAssets.length + 1).padStart(3, '0')}`;
    setAssetForm({
      assetId: nextCode,
      nameAr: '',
      nameEn: '',
      category: assetCategories.length > 0 ? assetCategories[0].nameEn : 'Kayaks',
      trackingMethod: 'Individual',
      quantity: 1,
      unitCost: 15000,
      totalAcquisitionCost: 15000,
      acquisitionCost: 15000,
      purchaseDate: new Date().toISOString().split('T')[0],
      inServiceDate: new Date().toISOString().split('T')[0],
      usefulLifeMonths: 60,
      depreciationMethod: 'Straight Line',
      residualValue: 0,
      status: 'Active',
      location: 'Aswan - Elephantine Island',
      costCenter: 'Aswan Hub',
      custodian: 'Captain Ali (Aswan Lead)',
      responsibleEmployee: 'Captain Ali',
      serialNumber: '',
      isOpeningBalance: false,
      assetAccountCode: '1210',
      depreciationAccountCode: '5500',
      accumulatedDepreciationAccountCode: '1220',
    });
    setShowAssetModal(true);
  };

  // Handle open Edit Asset
  const handleOpenEditAsset = (asset: FixedAsset) => {
    setEditingAsset(asset);
    setAssetForm({
      ...asset,
      trackingMethod: asset.trackingMethod || (asset.quantity > 1 ? 'Bulk' : 'Individual'),
      unitCost: asset.unitCost || (asset.acquisitionCost / (asset.quantity || 1)),
      totalAcquisitionCost: asset.totalAcquisitionCost || asset.acquisitionCost,
    });
    setShowAssetModal(true);
  };

  // Handle Save Asset
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const qty = Number(assetForm.quantity) || 1;
      const unitC = Number(assetForm.unitCost) || 0;
      const totalCost = assetForm.trackingMethod === 'Bulk' ? qty * unitC : unitC;

      const payload = {
        ...assetForm,
        quantity: qty,
        unitCost: unitC,
        totalAcquisitionCost: totalCost,
        acquisitionCost: totalCost,
        usefulLifeMonths: Number(assetForm.usefulLifeMonths) || 60,
        residualValue: Number(assetForm.residualValue) || 0,
      };

      if (editingAsset) {
        await updateFixedAsset(editingAsset.id, payload);
        setNotification({
          type: 'success',
          text: isAr ? `تم تحديث بيانات الأصل ${assetForm.assetId} بنجاح` : `Asset ${assetForm.assetId} updated`,
        });
      } else {
        await createFixedAsset(payload);
        setNotification({
          type: 'success',
          text: isAr
            ? `تم تسجيل الأصل الجديد ${assetForm.assetId} بنجاح${assetForm.isOpeningBalance ? ' (كرصيد افتتاحي)' : ' وإصدار قيد الشراء'}`
            : `Asset ${assetForm.assetId} created successfully`,
        });
      }
      setShowAssetModal(false);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error saving asset' });
    }
  };

  // Open Disposal Modal
  const handleOpenDisposal = (asset: FixedAsset) => {
    setDisposingAsset(asset);
    setDisposalForm({
      date: new Date().toISOString().split('T')[0],
      type: 'Sale',
      saleProceeds: asset.netBookValue,
      receivingAccountCode: '1111',
      reason: isAr ? 'بيع أصل قديم لتجديد الأسطول' : 'Fleet renewal sale',
    });
    setShowDisposalModal(true);
  };

  // Submit Disposal
  const handleExecuteDisposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disposingAsset) return;
    try {
      await disposeFixedAsset(disposingAsset.id, {
        date: disposalForm.date,
        type: disposalForm.type,
        saleProceeds: Number(disposalForm.saleProceeds) || 0,
        receivingAccountCode: disposalForm.receivingAccountCode,
        reason: disposalForm.reason,
      });
      setNotification({
        type: 'success',
        text: isAr
          ? `تم تنفيذ استبعاد/بيع الأصل ${disposingAsset.assetId} وترحيل القيد المحاسبي والأرباح/الخسائر الناتجة`
          : `Asset ${disposingAsset.assetId} successfully disposed/sold with journal entry posted`,
      });
      setShowDisposalModal(false);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error disposing asset' });
    }
  };

  // Open Add Category Modal
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      code: `CAT-${assetCategories.length + 1}`,
      nameAr: '',
      nameEn: '',
      defaultUsefulLifeMonths: 60,
      defaultDepreciationMethod: 'Straight Line',
      assetAccountCode: '1210',
      depreciationAccountCode: '5500',
      accDepreciationAccountCode: '1220',
      active: true,
    });
    setShowCategoryModal(true);
  };

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateAssetCategory(editingCategory.id, categoryForm);
        setNotification({ type: 'success', text: isAr ? 'تم تحديث التصنيف' : 'Category updated' });
      } else {
        await createAssetCategory(categoryForm);
        setNotification({ type: 'success', text: isAr ? 'تمت إضافة التصنيف الجديد' : 'Category created' });
      }
      setShowCategoryModal(false);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error saving category' });
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#147d9f]/20 to-[#fdfb45]/20 text-[#147d9f] border border-[#147d9f]/30">
              <Ship className="w-6 h-6 text-[#147d9f]" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isAr ? 'إدارة الأصول الثابتة والأسطول النيلي' : 'Fixed Assets & Fleet Management'}
              </h1>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isAr
                  ? 'سجل تفصيلي للقوارب والمعدات، احتساب الإهلاك الشهري، وتتبع الحركات والعهد والمواقع'
                  : 'Fleet tracking (Individual & Bulk), dynamic categories, automated monthly depreciation, and disposals'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('depreciation_run')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'depreciation_run'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-sm'
                : isLight
                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isAr ? 'تشغيل الإهلاك الشهري' : 'Run Depreciation'}</span>
          </button>

          <button
            onClick={handleOpenAddAsset}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#147d9f] text-white hover:bg-[#116986] flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? 'تسجيل أصل جديد' : 'New Asset'}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="font-bold hover:opacity-80">×</button>
        </div>
      )}

      {/* High-Level Valuation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172e] border-slate-800'
          }`}
        >
          <div className="text-[11px] text-slate-400 mb-1">{isAr ? 'إجمالي الأصول' : 'Total Assets'}</div>
          <div className="text-xl font-bold font-mono text-white">{fixedAssets.length}</div>
          <div className="text-[10px] text-emerald-400 mt-1">
            {summaryMetrics.activeCount} {isAr ? 'أصل بحالة نشطة' : 'active assets'}
          </div>
        </div>

        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172e] border-slate-800'
          }`}
        >
          <div className="text-[11px] text-slate-400 mb-1">{isAr ? 'الوحدات المادية (قطع)' : 'Physical Units'}</div>
          <div className="text-xl font-bold font-mono text-[#fdfb45]">{summaryMetrics.totalQty}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {fixedAssets.filter((a) => a.trackingMethod === 'Bulk').length} {isAr ? 'أصول تجميعية' : 'bulk groups'}
          </div>
        </div>

        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172e] border-slate-800'
          }`}
        >
          <div className="text-[11px] text-slate-400 mb-1">{isAr ? 'تكلفة الاقتناء التاريخية' : 'Acquisition Cost'}</div>
          <div className="text-lg font-bold font-mono text-cyan-400">{formatMoney(summaryMetrics.totalAcqCost)}</div>
          <div className="text-[10px] text-slate-400 mt-1">{isAr ? 'حساب 1210' : 'Acc 1210'}</div>
        </div>

        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172e] border-slate-800'
          }`}
        >
          <div className="text-[11px] text-slate-400 mb-1">{isAr ? 'مجمع الإهلاك' : 'Acc. Depreciation'}</div>
          <div className="text-lg font-bold font-mono text-rose-400">-{formatMoney(summaryMetrics.totalAccDep)}</div>
          <div className="text-[10px] text-slate-400 mt-1">{isAr ? 'حساب 1220' : 'Acc 1220'}</div>
        </div>

        <div
          className={`p-3.5 rounded-xl border col-span-2 md:col-span-1 transition-colors ${
            isLight ? 'bg-emerald-50/50 border-emerald-200 shadow-sm' : 'bg-emerald-950/20 border-emerald-800/40'
          }`}
        >
          <div className="text-[11px] text-emerald-400 mb-1">{isAr ? 'صافي القيمة الدفترية' : 'Net Book Value'}</div>
          <div className="text-lg font-bold font-mono text-emerald-400">{formatMoney(summaryMetrics.totalNBV)}</div>
          <div className="text-[10px] text-slate-400 mt-1">{isAr ? 'القيمة الرأسمالية الحالية' : 'Current Book Valuation'}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'register', labelAr: 'سجل الأصول والأسطول', labelEn: 'Fleet Register', icon: Ship },
          { id: 'depreciation_run', labelAr: 'تشغيل الإهلاك الشهري', labelEn: 'Depreciation Run', icon: Play },
          { id: 'categories', labelAr: 'تصنيفات الأصول والسياسات', labelEn: 'Asset Categories', icon: Sliders },
          { id: 'movement_report', labelAr: 'تقرير حركة الأصول', labelEn: 'Asset Movement Report', icon: FileSpreadsheet },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[#147d9f] text-white shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:bg-slate-200'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{isAr ? tab.labelAr : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: FLEET & ASSET REGISTER */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div
            className={`p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0f172e] border-slate-800'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                  isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-900 border-slate-700 text-white'
                }`}
              >
                <option value="ALL">{isAr ? 'كل التصنيفات' : 'All Categories'}</option>
                {assetCategories.map((c) => (
                  <option key={c.id} value={c.nameEn}>
                    {isAr ? c.nameAr : c.nameEn}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                  isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-900 border-slate-700 text-white'
                }`}
              >
                <option value="ALL">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
                <option value="Active">{isAr ? 'نشط في الخدمة' : 'Active'}</option>
                <option value="Under Maintenance">{isAr ? 'تحت الصيانة' : 'Under Maintenance'}</option>
                <option value="Temporarily Unavailable">{isAr ? 'غير متاح مؤقتاً' : 'Temporarily Unavailable'}</option>
                <option value="Disposed">{isAr ? 'مستبعد / تالف' : 'Disposed'}</option>
                <option value="Sold">{isAr ? 'مباع' : 'Sold'}</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isAr ? 'بحث برقم الأصل أو الاسم أو العهدة...' : 'Search asset code, name, custodian...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ps-9 pe-3 py-1.5 rounded-lg text-xs border focus:outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#147d9f]'
                    : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-[#147d9f]'
                }`}
              />
            </div>
          </div>

          {/* Assets Grid / Table */}
          <div
            className={`rounded-xl border overflow-hidden transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172e] border-slate-800'
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr
                    className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                      isLight ? 'bg-slate-100/70 border-slate-200 text-slate-600' : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <th className="py-3 px-3 text-start">{isAr ? 'كود الأصل' : 'Asset ID'}</th>
                    <th className="py-3 px-3 text-start">{isAr ? 'المعدة والاسم' : 'Asset Description'}</th>
                    <th className="py-3 px-3 text-start">{isAr ? 'التصنيف' : 'Category'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'التتبع / الكمية' : 'Tracking / Qty'}</th>
                    <th className="py-3 px-3 text-start">{isAr ? 'الموقع والعهدة' : 'Location & Custodian'}</th>
                    <th className="py-3 px-3 text-end">{isAr ? 'تكلفة الاقتناء' : 'Acquisition Cost'}</th>
                    <th className="py-3 px-3 text-end text-rose-400">{isAr ? 'مجمع الإهلاك' : 'Acc. Dep.'}</th>
                    <th className="py-3 px-3 text-end text-emerald-400">{isAr ? 'صافي القيمة الدفترية' : 'NBV'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 text-xs">
                        {isAr ? 'لا توجد أصول مطابقة لمعايير البحث' : 'No assets found'}
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset) => {
                      const cost = asset.totalAcquisitionCost || asset.acquisitionCost;
                      const isRetired = asset.status === 'Disposed' || asset.status === 'Sold';

                      return (
                        <tr
                          key={asset.id}
                          className={`transition-colors ${
                            isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          {/* Asset ID */}
                          <td className="py-3 px-3 font-mono font-semibold">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[#147d9f] font-bold">
                              {asset.assetId}
                            </span>
                            {asset.isOpeningBalance && (
                              <span className="ms-1 px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/10 text-indigo-400 font-bold">
                                OB
                              </span>
                            )}
                          </td>

                          {/* Asset Name */}
                          <td className="py-3 px-3 font-medium text-slate-200">
                            <div>{isAr ? asset.nameAr : asset.nameEn}</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              {isAr ? asset.nameEn : asset.nameAr}
                              {asset.serialNumber && ` • SN: ${asset.serialNumber}`}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3 text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-800/80 text-[11px]">
                              {asset.category}
                            </span>
                          </td>

                          {/* Tracking & Qty */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                asset.trackingMethod === 'Bulk'
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}
                            >
                              {asset.quantity} {isAr ? 'قطع' : 'pcs'} ({asset.trackingMethod || 'Individual'})
                            </span>
                          </td>

                          {/* Location & Custodian */}
                          <td className="py-3 px-3 text-slate-300">
                            <div>{asset.location || 'Aswan'}</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              {asset.custodian || asset.responsibleEmployee || 'Lead Captain'}
                            </div>
                          </td>

                          {/* Acquisition Cost */}
                          <td className="py-3 px-3 text-end font-mono font-semibold text-slate-200">
                            {formatMoney(cost)}
                            {asset.quantity > 1 && asset.unitCost && (
                              <div className="text-[10px] text-slate-500 font-normal">
                                @ {formatMoney(asset.unitCost)}
                              </div>
                            )}
                          </td>

                          {/* Accumulated Depreciation */}
                          <td className="py-3 px-3 text-end font-mono text-rose-400">
                            -{formatMoney(asset.accumulatedDepreciation)}
                          </td>

                          {/* Net Book Value */}
                          <td className="py-3 px-3 text-end font-mono font-bold text-emerald-400">
                            {formatMoney(asset.netBookValue)}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                asset.status === 'Active'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : asset.status === 'Under Maintenance'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : asset.status === 'Sold'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {asset.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditAsset(asset)}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                title={isAr ? 'تعديل بيانات الأصل' : 'Edit Asset'}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {!isRetired && (
                                <button
                                  onClick={() => handleOpenDisposal(asset)}
                                  className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                                  title={isAr ? 'استبعاد / بيع الأصل' : 'Dispose / Sell'}
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY DEPRECIATION RUN */}
      {activeTab === 'depreciation_run' && (
        <div className="space-y-4">
          {/* Period Selector Card */}
          <div
            className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0f172e] border-slate-800'
            }`}
          >
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'احتساب وترحيل قسط الإهلاك الشهري للأصول' : 'Monthly Fleet Depreciation Engine'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'يقوم النظام بحساب القسط الشهري تلقائياً بالقسط الثابت مع إيقاف الإهلاك عند الوصول للقيمة التخريدية'
                  : 'Calculates straight-line monthly depreciation and posts Dr 5500 (Dep Expense) / Cr 1220 (Acc Dep)'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">{isAr ? 'السنة:' : 'Year:'}</span>
                <select
                  value={depYear}
                  onChange={(e) => setDepYear(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs"
                >
                  {[2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">{isAr ? 'الشهر:' : 'Month:'}</span>
                <select
                  value={depMonth}
                  onChange={(e) => setDepMonth(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m} ({new Date(2026, m - 1).toLocaleString('en', { month: 'short' })})</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleExecuteDepreciation}
                disabled={executingDep || depPreview.length === 0}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                  depPreview.length > 0 && !executingDep
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20'
                    : 'bg-slate-700 text-slate-400 opacity-60 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {executingDep
                    ? (isAr ? 'جاري الترحيل...' : 'Posting...')
                    : (isAr ? `اعتماد وترحيل إهلاك (${depYear}-${String(depMonth).padStart(2, '0')})` : `Post Depreciation (${depYear}-${String(depMonth).padStart(2, '0')})`)}
                </span>
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <div
            className={`rounded-xl border overflow-hidden transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172e] border-slate-800'
            }`}
          >
            <div className="p-3 border-b border-slate-800 bg-[#0c142b] flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                {isAr
                  ? `الأصول المؤهلة للإهلاك في فترة (${depYear}-${String(depMonth).padStart(2, '0')}): ${depPreview.length} أصل`
                  : `Eligible Assets for Period (${depYear}-${String(depMonth).padStart(2, '0')}): ${depPreview.length}`}
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {isAr ? 'إجمالي القسط الشهري: ' : 'Total Monthly Dep: '}
                {formatMoney(depPreview.reduce((s, p) => s + p.monthlyDepreciation, 0))}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr
                    className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                      isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    <th className="py-2.5 px-3 text-start">{isAr ? 'كود الأصل' : 'Asset ID'}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'اسم الأصل' : 'Asset Name'}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'التصنيف' : 'Category'}</th>
                    <th className="py-2.5 px-3 text-end">{isAr ? 'التكلفة الإجمالية' : 'Acq. Cost'}</th>
                    <th className="py-2.5 px-3 text-end">{isAr ? 'صافي القيمة الحالي' : 'Current NBV'}</th>
                    <th className="py-2.5 px-3 text-end text-amber-400 font-bold">{isAr ? 'قسط الإهلاك للشهر' : 'Monthly Dep'}</th>
                    <th className="py-2.5 px-3 text-end text-emerald-400">{isAr ? 'صافي القيمة المتوقع بعد الإهلاك' : 'Projected NBV'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {depPreview.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                        {isAr ? 'لا توجد أصول نشطة قابلة للإهلاك أو تم إهلاك كافة الأصول بالكامل' : 'No active assets require depreciation for this period'}
                      </td>
                    </tr>
                  ) : (
                    depPreview.map((item) => (
                      <tr key={item.assetId} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-mono text-[#147d9f] font-bold">{item.assetId}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-200">
                          {isAr ? item.nameAr : item.nameEn}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{item.category}</td>
                        <td className="py-2.5 px-3 text-end font-mono text-slate-300">{formatMoney(item.acquisitionCost)}</td>
                        <td className="py-2.5 px-3 text-end font-mono text-slate-300">{formatMoney(item.currentNetBookValue ?? item.netBookValue)}</td>
                        <td className="py-2.5 px-3 text-end font-mono font-bold text-amber-400">{formatMoney(item.monthlyDepreciation)}</td>
                        <td className="py-2.5 px-3 text-end font-mono font-bold text-emerald-400">{formatMoney(item.projectedNetBookValue ?? (item.netBookValue - item.monthlyDepreciation))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Past Depreciation Runs History */}
          {depreciationRuns.length > 0 && (
            <div
              className={`rounded-xl border p-4 transition-colors ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172e] border-slate-800'
              }`}
            >
              <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{isAr ? 'سجل تشغيلات الإهلاك السابقة' : 'Depreciation Runs History'}</span>
              </h4>
              <div className="space-y-2">
                {depreciationRuns.map((run) => (
                  <div
                    key={run.id}
                    className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-amber-400">{run.period}</span>
                      <span className="font-mono text-slate-300">{run.journalNumber}</span>
                      <span className="text-slate-500">({run.assetCount ?? run.totalAssetsCount} {isAr ? 'أصل' : 'assets'})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-emerald-400">{formatMoney(run.totalDepreciation ?? run.totalDepreciationAmount ?? 0)}</span>
                      <span className="text-[10px] text-slate-500">{(run.executedAt || run.createdAt || '').split('T')[0]} by {run.executedBy || run.createdBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DYNAMIC ASSET CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'تصنيفات الأصول الثابتة وقواعد الإهلاك' : 'Asset Categories & Depreciation Rules'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'إدارة التصنيفات، وتحديد العمر الإنتاجي الافتراضي لكل فئة وحسابات اليومية المرتبطة'
                  : 'Manage fleet categories, default useful lives, and GL mapping'}
              </p>
            </div>
            <button
              onClick={handleOpenAddCategory}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#147d9f] text-white hover:bg-[#116986] flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إضافة تصنيف' : 'Add Category'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {assetCategories.map((cat) => (
              <div
                key={cat.id}
                className={`p-4 rounded-xl border transition-all ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#0f172e] border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[#147d9f] font-mono text-xs font-bold">
                    {cat.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      cat.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {cat.active ? (isAr ? 'نشط' : 'Active') : isAr ? 'معطل' : 'Inactive'}
                  </span>
                </div>

                <div className="text-sm font-bold text-white mb-0.5">{isAr ? cat.nameAr : cat.nameEn}</div>
                <div className="text-xs text-slate-500 mb-3">{isAr ? cat.nameEn : cat.nameAr}</div>

                <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800 pt-2">
                  <div className="flex justify-between">
                    <span>{isAr ? 'العمر الافتراضي:' : 'Useful Life:'}</span>
                    <span className="font-semibold text-slate-200">{cat.defaultUsefulLifeMonths} {isAr ? 'شهر' : 'months'} ({Math.round(cat.defaultUsefulLifeMonths / 12)} {isAr ? 'سنوات' : 'yrs'})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'طريقة الإهلاك:' : 'Dep. Method:'}</span>
                    <span className="font-semibold text-slate-200">{cat.defaultDepreciationMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'حساب الأصل:' : 'Asset Acc:'}</span>
                    <span className="font-mono text-[#147d9f]">{cat.assetAccountCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'مصروف الإهلاك:' : 'Expense Acc:'}</span>
                    <span className="font-mono text-amber-400">{cat.depreciationAccountCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'مجمع الإهلاك:' : 'Acc Dep Acc:'}</span>
                    <span className="font-mono text-rose-400">{cat.accDepreciationAccountCode}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ASSET MOVEMENT REPORT */}
      {activeTab === 'movement_report' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? 'تقرير حركة الأصول الثابتة ومجمعات الإهلاك' : 'Fixed Asset Movement Schedule'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'عرض تفصيلي لتكلفة أول المدة، الإضافات، الاستبعادات، إهلاك الفترة، وصافي القيمة الختامية'
                  : 'Rollforward schedule: Opening Cost, Additions, Disposals, Closing Cost, Dep Charges, Closing NBV'}
              </p>
            </div>
            <button
              onClick={loadMovementReport}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحديث التقرير' : 'Refresh'}</span>
            </button>
          </div>

          <div
            className={`rounded-xl border overflow-hidden transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172e] border-slate-800'
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr
                    className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                      isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    <th className="py-3 px-3 text-start">{isAr ? 'فئة الأصل' : 'Category'}</th>
                    <th className="py-3 px-3 text-end">{isAr ? 'تكلفة افتتاحية' : 'Opening Cost'}</th>
                    <th className="py-3 px-3 text-end text-cyan-400">{isAr ? 'إضافات / مشتريات' : 'Additions'}</th>
                    <th className="py-3 px-3 text-end text-rose-400">{isAr ? 'استبعادات' : 'Disposals'}</th>
                    <th className="py-3 px-3 text-end font-bold">{isAr ? 'تكلفة ختامية' : 'Closing Cost'}</th>
                    <th className="py-3 px-3 text-end text-amber-400">{isAr ? 'مجمع أول المدة' : 'Opening Acc Dep'}</th>
                    <th className="py-3 px-3 text-end text-rose-400">{isAr ? 'إهلاك الفترة' : 'Dep Charge'}</th>
                    <th className="py-3 px-3 text-end font-bold text-emerald-400">{isAr ? 'صافي القيمة الدفترية' : 'Closing NBV'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {movementReport.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                        {loadingMovement ? (isAr ? 'جاري تحميل التقرير...' : 'Loading...') : (isAr ? 'لا توجد بيانات' : 'No data')}
                      </td>
                    </tr>
                  ) : (
                    movementReport.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-semibold text-slate-200">{row.category}</td>
                        <td className="py-3 px-3 text-end font-mono text-slate-300">{formatMoney(row.openingCost)}</td>
                        <td className="py-3 px-3 text-end font-mono text-cyan-400">+{formatMoney(row.purchasesCost)}</td>
                        <td className="py-3 px-3 text-end font-mono text-rose-400">-{formatMoney(row.disposalsCost)}</td>
                        <td className="py-3 px-3 text-end font-mono font-bold text-white">{formatMoney(row.closingCost)}</td>
                        <td className="py-3 px-3 text-end font-mono text-amber-400">{formatMoney(row.openingAccDep)}</td>
                        <td className="py-3 px-3 text-end font-mono text-rose-400">+{formatMoney(row.depreciationCharge)}</td>
                        <td className="py-3 px-3 text-end font-mono font-bold text-emerald-400">{formatMoney(row.closingNetBookValue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ASSET */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`w-full max-w-2xl rounded-2xl border p-6 space-y-4 shadow-2xl my-8 ${
              isLight ? 'bg-white border-slate-300' : 'bg-[#0f172e] border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Ship className="w-5 h-5 text-[#147d9f]" />
                <h3 className="text-lg font-bold text-white">
                  {editingAsset
                    ? (isAr ? `تعديل الأصل: ${editingAsset.assetId}` : `Edit Asset: ${editingAsset.assetId}`)
                    : (isAr ? 'تسجيل أصل ومعدة جديدة في الأسطول' : 'Register New Fleet Asset')}
                </h3>
              </div>
              <button
                onClick={() => setShowAssetModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Asset ID */}
                <div>
                  <label className="block text-slate-400 mb-1">{isAr ? 'كود الأصل' : 'Asset Code'}</label>
                  <input
                    type="text"
                    required
                    value={assetForm.assetId || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, assetId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-slate-400 mb-1">{isAr ? 'التصنيف' : 'Category'}</label>
                  <select
                    value={assetForm.category || 'Kayaks'}
                    onChange={(e) => {
                      const selCat = assetCategories.find((c) => c.nameEn === e.target.value);
                      setAssetForm({
                        ...assetForm,
                        category: e.target.value,
                        usefulLifeMonths: selCat?.defaultUsefulLifeMonths || assetForm.usefulLifeMonths,
                        depreciationMethod: selCat?.defaultDepreciationMethod || assetForm.depreciationMethod,
                        assetAccountCode: selCat?.assetAccountCode || assetForm.assetAccountCode,
                        depreciationAccountCode: selCat?.depreciationAccountCode || assetForm.depreciationAccountCode,
                        accumulatedDepreciationAccountCode: selCat?.accDepreciationAccountCode || assetForm.accumulatedDepreciationAccountCode,
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                  >
                    {assetCategories.map((c) => (
                      <option key={c.id} value={c.nameEn}>
                        {isAr ? c.nameAr : c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Arabic Name */}
                <div>
                  <label className="block text-slate-400 mb-1">{isAr ? 'الاسم بالعربية' : 'Arabic Name'}</label>
                  <input
                    type="text"
                    required
                    value={assetForm.nameAr || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, nameAr: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>

                {/* English Name */}
                <div>
                  <label className="block text-slate-400 mb-1">{isAr ? 'الاسم بالإنجليزية' : 'English Name'}</label>
                  <input
                    type="text"
                    required
                    value={assetForm.nameEn || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, nameEn: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>

                {/* Tracking Method */}
                <div>
                  <label className="block text-slate-400 mb-1">{isAr ? 'طريقة التتبع' : 'Tracking Method'}</label>
                  <select
                    value={assetForm.trackingMethod || 'Individual'}
                    onChange={(e) => setAssetForm({ ...assetForm, trackingMethod: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                  >
                    <option value="Individual">{isAr ? 'فردي (قطعة واحدة برقم محدد)' : 'Individual (Single Unit)'}</option>
                    <option value="Bulk">{isAr ? 'تجميعي (كمية بسعر وحدة إجمالي)' : 'Bulk (Quantity & Unit Cost)'}</option>
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-slate-400 mb-1">{isAr ? 'الكمية' : 'Quantity'}</label>
                  <input
                    type="number"
                    min="1"
                    value={assetForm.quantity || 1}
                    onChange={(e) => {
                      const q = parseInt(e.target.value) || 1;
                      setAssetForm({
                        ...assetForm,
                        quantity: q,
                        totalAcquisitionCost: q * (Number(assetForm.unitCost) || 0),
                        acquisitionCost: q * (Number(assetForm.unitCost) || 0),
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>

                {/* Unit Cost */}
                <div>
                  <label className="block text-slate-400 mb-1">{isAr ? 'سعر الوحدة (ج.م)' : 'Unit Cost (EGP)'}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={assetForm.unitCost || 0}
                    onChange={(e) => {
                      const u = parseFloat(e.target.value) || 0;
                      setAssetForm({
                        ...assetForm,
                        unitCost: u,
                        totalAcquisitionCost: (Number(assetForm.quantity) || 1) * u,
                        acquisitionCost: (Number(assetForm.quantity) || 1) * u,
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>

                {/* Total Acquisition Cost */}
                <div>
                  <label className="block text-slate-400 mb-1">{isAr ? 'إجمالي تكلفة الاقتناء' : 'Total Cost (EGP)'}</label>
                  <input
                    type="text"
                    disabled
                    value={formatMoney(assetForm.totalAcquisitionCost || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 font-mono text-emerald-400 font-bold"
                  />
                </div>

                {/* Useful Life Months */}
                <div>
                  <label className="block text-slate-400 mb-1">{isAr ? 'العمر الإنتاجي (بالأشهر)' : 'Useful Life (Months)'}</label>
                  <input
                    type="number"
                    value={assetForm.usefulLifeMonths || 60}
                    onChange={(e) => setAssetForm({ ...assetForm, usefulLifeMonths: parseInt(e.target.value) || 60 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>

                {/* Residual Value */}
                <div>
                  <label className="block text-slate-400 mb-1">{isAr ? 'القيمة التخريدية (الخردة)' : 'Residual Value (EGP)'}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={assetForm.residualValue || 0}
                    onChange={(e) => setAssetForm({ ...assetForm, residualValue: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-slate-400 mb-1">{isAr ? 'الموقع' : 'Location'}</label>
                  <input
                    type="text"
                    value={assetForm.location || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>

                {/* Custodian */}
                <div>
                  <label className="block text-slate-400 mb-1">{isAr ? 'مسؤول العهدة / الكابتن' : 'Custodian'}</label>
                  <input
                    type="text"
                    value={assetForm.custodian || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, custodian: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Is Opening Balance Checkbox (Only for new asset) */}
              {!editingAsset && (
                <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-2.5 text-xs text-indigo-300">
                  <input
                    type="checkbox"
                    id="isOb"
                    checked={assetForm.isOpeningBalance || false}
                    onChange={(e) => setAssetForm({ ...assetForm, isOpeningBalance: e.target.checked })}
                    className="mt-0.5 rounded text-[#147d9f] focus:ring-0"
                  />
                  <label htmlFor="isOb" className="cursor-pointer">
                    <span className="font-bold">{isAr ? 'تسجيل الأصل كرصيد افتتاحي (Opening Balance)' : 'Register as Opening Balance Asset'}</span>
                    <p className="text-[11px] text-indigo-300/80 mt-0.5">
                      {isAr
                        ? 'عند تفعيل هذا الخيار، لن يتم إنشاء قيد شراء جديد لتفادي التكرار، نظراً لأن رصيد الأصل مسجل بالفعل في ميزانية بداية المدة.'
                        : 'If checked, no purchase journal is generated since the cost is already part of the opening balance journal.'}
                    </p>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#147d9f] text-white hover:bg-[#116986] shadow-sm"
                >
                  {isAr ? 'حفظ الأصل' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISPOSAL & SALE */}
      {showDisposalModal && disposingAsset && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl ${
              isLight ? 'bg-white border-slate-300' : 'bg-[#0f172e] border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-rose-400" />
                <h3 className="text-lg font-bold text-white">
                  {isAr ? `استبعاد أو بيع أصل: ${disposingAsset.assetId}` : `Dispose / Sell Asset: ${disposingAsset.assetId}`}
                </h3>
              </div>
              <button
                onClick={() => setShowDisposalModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ×
              </button>
            </div>

            {/* Asset quick details */}
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block">{isAr ? 'التكلفة التاريخية' : 'Cost'}</span>
                <span className="font-mono font-bold text-white">
                  {formatMoney(disposingAsset.totalAcquisitionCost || disposingAsset.acquisitionCost)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'مجمع الإهلاك' : 'Acc. Dep.'}</span>
                <span className="font-mono font-bold text-rose-400">
                  -{formatMoney(disposingAsset.accumulatedDepreciation)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'صافي القيمة الدفترية' : 'NBV'}</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatMoney(disposingAsset.netBookValue)}
                </span>
              </div>
            </div>

            <form onSubmit={handleExecuteDisposal} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{isAr ? 'نوع الاستبعاد' : 'Disposal Type'}</label>
                <select
                  value={disposalForm.type}
                  onChange={(e) => setDisposalForm({ ...disposalForm, type: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                >
                  <option value="Sale">{isAr ? 'بيع أصل (تحصيل مقابل نقدي)' : 'Sale of Asset'}</option>
                  <option value="Scrap">{isAr ? 'تخريد / إهلاك كامل كخردة' : 'Scrap / Write-off'}</option>
                  <option value="Loss">{isAr ? 'فقدان أو تلف غير قابل للإصلاح' : 'Loss / Damage'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{isAr ? 'تاريخ الاستبعاد' : 'Date'}</label>
                <input
                  type="date"
                  value={disposalForm.date}
                  onChange={(e) => setDisposalForm({ ...disposalForm, date: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                />
              </div>

              {disposalForm.type === 'Sale' && (
                <>
                  <div>
                    <label className="block text-slate-400 mb-1">{isAr ? 'قيمة البيع المحصلة (ج.م)' : 'Sale Proceeds (EGP)'}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={disposalForm.saleProceeds}
                      onChange={(e) => setDisposalForm({ ...disposalForm, saleProceeds: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">{isAr ? 'حساب الاستلام النقدي' : 'Receiving Account'}</label>
                    <select
                      value={disposalForm.receivingAccountCode}
                      onChange={(e) => setDisposalForm({ ...disposalForm, receivingAccountCode: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                    >
                      <option value="1111">1111 - {isAr ? 'الخزينة النقدية الرئيسية' : 'Main Cash Vault'}</option>
                      <option value="1112">1112 - {isAr ? 'البنك التجاري الدولي CIB' : 'CIB Bank'}</option>
                      <option value="1114">1114 - {isAr ? 'إنستاباي' : 'InstaPay'}</option>
                    </select>
                  </div>
                </>
              )}

              {/* Gain / Loss Preview */}
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex justify-between items-center text-xs">
                <span>{isAr ? 'الربح / الخسارة الرأسمالية المحققة:' : 'Realized Gain / Loss:'}</span>
                {disposalForm.saleProceeds - disposingAsset.netBookValue >= 0 ? (
                  <span className="font-mono font-bold text-emerald-400">
                    +{formatMoney(disposalForm.saleProceeds - disposingAsset.netBookValue)} ({isAr ? 'أرباح رأسمالية 4400' : 'Gain 4400'})
                  </span>
                ) : (
                  <span className="font-mono font-bold text-rose-400">
                    {formatMoney(disposalForm.saleProceeds - disposingAsset.netBookValue)} ({isAr ? 'خسائر رأسمالية 5600' : 'Loss 5600'})
                  </span>
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{isAr ? 'سبب الاستبعاد وملاحظات' : 'Reason / Notes'}</label>
                <textarea
                  rows={2}
                  value={disposalForm.reason}
                  onChange={(e) => setDisposalForm({ ...disposalForm, reason: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDisposalModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 shadow-sm"
                >
                  {isAr ? 'تنفيذ الاستبعاد وترحيل القيد' : 'Execute Disposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CATEGORY */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${
              isLight ? 'bg-white border-slate-300' : 'bg-[#0f172e] border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingCategory ? (isAr ? 'تعديل التصنيف' : 'Edit Category') : (isAr ? 'إضافة تصنيف أصول جديد' : 'New Asset Category')}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{isAr ? 'رمز التصنيف' : 'Category Code'}</label>
                <input
                  type="text"
                  required
                  value={categoryForm.code || ''}
                  onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{isAr ? 'الاسم بالعربية' : 'Arabic Name'}</label>
                <input
                  type="text"
                  required
                  value={categoryForm.nameAr || ''}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nameAr: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{isAr ? 'الاسم بالإنجليزية' : 'English Name'}</label>
                <input
                  type="text"
                  required
                  value={categoryForm.nameEn || ''}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{isAr ? 'العمر الافتراضي (بالأشهر)' : 'Default Useful Life (Months)'}</label>
                <input
                  type="number"
                  value={categoryForm.defaultUsefulLifeMonths || 60}
                  onChange={(e) => setCategoryForm({ ...categoryForm, defaultUsefulLifeMonths: parseInt(e.target.value) || 60 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#147d9f] text-white hover:bg-[#116986]"
                >
                  {isAr ? 'حفظ' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
