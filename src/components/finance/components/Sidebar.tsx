import React from 'react';
import { useErp, ActiveModule } from '../context/ErpContext';
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  ArrowRightLeft,
  ShoppingCart,
  Users,
  Building2,
  Wallet,
  Network,
  BookOpen,
  Layers,
  Scale,
  LineChart,
  Ship,
  BadgePercent,
  Compass,
  FileSpreadsheet,
  FileUp,
  Sliders,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  SlidersHorizontal,
  Calendar,
  Landmark,
  Cloud,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  id: ActiveModule;
  labelEn: string;
  labelAr: string;
  icon: LucideIcon;
}

interface NavSection {
  titleEn: string;
  titleAr: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { activeModule, setActiveModule, lang, periods, theme } = useErp();
  const isLight = theme === 'light';

  const sections: NavSection[] = [
    {
      titleEn: 'Operations & Commercial',
      titleAr: 'العمليات والمبيعات',
      items: [
        { id: 'dashboard', labelEn: 'Dashboard', labelAr: 'لوحة المؤشرات العامة', icon: LayoutDashboard },
        { id: 'trips_catalog', labelEn: 'Trips & Pricing Catalog', labelAr: 'كتالوج الرحلات والأسعار (10)', icon: Compass },
        { id: 'bookings', labelEn: 'Bookings & Operations', labelAr: 'الحجوزات والعمليات', icon: Calendar },
        { id: 'tour_profitability', labelEn: 'Tour Profitability', labelAr: 'المعاملات وربحية الرحلات', icon: TrendingUp },
        { id: 'invoices', labelEn: 'Sales & Invoices', labelAr: 'فواتير المبيعات', icon: FileText },
        { id: 'receipts', labelEn: 'Customer Receipts', labelAr: 'سندات قبض العملاء', icon: DollarSign },
        { id: 'expenses', labelEn: 'Expenses & Vouchers', labelAr: 'المصروفات وسندات الصرف', icon: ArrowRightLeft },
        { id: 'purchases', labelEn: 'Purchases & Payables', labelAr: 'فواتير المشتريات', icon: ShoppingCart },
        { id: 'customers', labelEn: 'Customers Directory', labelAr: 'دليل العملاء', icon: Users },
        { id: 'suppliers', labelEn: 'Suppliers & Providers', labelAr: 'الموردون ومقدمو الخدمات', icon: Building2 },
      ],
    },
    {
      titleEn: 'Accounting Engine',
      titleAr: 'المحاسبة ودفتر الأستاذ',
      items: [
        { id: 'opening_balances', labelEn: 'Opening Balances', labelAr: 'الأرصدة الافتتاحية', icon: Landmark },
        { id: 'chart_of_accounts', labelEn: 'Chart of Accounts', labelAr: 'دليل الحسابات (الشجرة)', icon: Network },
        { id: 'journal_entries', labelEn: 'Journal Entries', labelAr: 'قيود اليومية المحاسبية', icon: BookOpen },
        { id: 'general_ledger', labelEn: 'General Ledger', labelAr: 'دفتر الأستاذ العام', icon: Layers },
        { id: 'trial_balance', labelEn: 'Trial Balance', labelAr: 'ميزان المراجعة', icon: Scale },
        { id: 'financial_statements', labelEn: 'Financial Statements', labelAr: 'القوائم والتقارير الختامية', icon: LineChart },
        { id: 'cash_banks', labelEn: 'Cash & Banks', labelAr: 'الخزينة والبنوك والمحافظ', icon: Wallet },
      ],
    },
    {
      titleEn: 'Fleet & Analytics',
      titleAr: 'الأسطول والمراكز النيلية',
      items: [
        { id: 'fixed_assets', labelEn: 'Fixed Assets Register', labelAr: 'سجل الأصول والإهلاك', icon: Ship },
        { id: 'provider_settlements', labelEn: 'Provider Settlements', labelAr: 'تسويات الكباتن والمراكبية', icon: BadgePercent },
        { id: 'cost_centers', labelEn: 'Cost Centers & Tours', labelAr: 'مراكز التكلفة والأنشطة', icon: Compass },
        { id: 'reports', labelEn: 'Accounting Reports', labelAr: 'التقارير التحليلية والضرائب', icon: FileSpreadsheet },
      ],
    },
    {
      titleEn: 'Governance & Migration',
      titleAr: 'الحوكمة واستيراد إكسيل',
      items: [
        { id: 'google_drive', labelEn: 'Google Drive & GitHub', labelAr: 'أرشيف Drive وجيت هب', icon: Cloud },
        { id: 'internal_controls', labelEn: 'Internal Controls & Governance', labelAr: 'التحكم الداخلي والحوكمة', icon: SlidersHorizontal },
        { id: 'excel_import', labelEn: 'Excel Import Center', labelAr: 'مركز استيراد إكسيل', icon: FileUp },
        { id: 'acceptance_tests', labelEn: 'Acceptance Tests (17)', labelAr: 'اختبارات القبول (17 خطوة)', icon: CheckCircle2 },
        { id: 'settings', labelEn: 'Settings & Periods', labelAr: 'الإعدادات وإقفال الفترات', icon: Sliders },
        { id: 'audit_logs', labelEn: 'Audit Trail', labelAr: 'سجل التدقيق والأمان', icon: ShieldAlert },
      ],
    },
  ];

  const thisMonth = new Date();
  const currentOpenPeriod =
    periods.find((p) => p.status === 'Open' && p.year === thisMonth.getFullYear() && p.month === thisMonth.getMonth() + 1) ||
    periods.find((p) => p.status === 'Open');

  return (
    <aside
      className={`w-64 border-r flex flex-col shrink-0 overflow-y-auto select-none transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-700'
          : 'bg-[#0a0f21] border-slate-800/80 text-slate-300'
      }`}
    >
      {/* Current Period Status Banner */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between text-xs transition-colors ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0c142b] border-slate-800/60'
        }`}
      >
        <span className={`font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          {lang === 'ar' ? 'الفترة المالية:' : 'Fiscal Period:'}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
            {currentOpenPeriod?.name || 'Nov 2026'}
          </span>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 px-3 py-4 space-y-6">
        {sections.map((sec, sIdx) => (
          <div key={sIdx}>
            <div
              className={`px-3 mb-2 text-[11px] font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {lang === 'ar' ? sec.titleAr : sec.titleEn}
            </div>
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveModule(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded transition-colors text-left ${
                      isActive
                        ? 'bg-[#147d9f] text-white font-semibold shadow-xs'
                        : isLight
                        ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[#fdfb45]' : isLight ? 'text-slate-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{lang === 'ar' ? item.labelAr : item.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* DUCK Nile Footer */}
      <div
        className={`p-3 border-t text-[11px] flex items-center justify-between transition-colors ${
          isLight ? 'border-slate-200 text-slate-500 bg-slate-50/50' : 'border-slate-800/80 text-slate-400 bg-transparent'
        }`}
      >
        <span>DUCK Nile Base · Aswan</span>
        <span className="font-mono text-[10px]">v2.6.0-ERP</span>
      </div>
    </aside>
  );
};
