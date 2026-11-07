import React from 'react';
import { useErp } from '../context/ErpContext';
import { FinanceLogo } from './FinanceLogo';
import {
  Anchor,
  Globe,
  Coins,
  ShieldCheck,
  CheckCircle2,
  FileText,
  DollarSign,
  BookOpen,
  ArrowRightLeft,
  Sparkles,
  Sun,
  Moon,
  TrendingUp,
  Compass,
  LogOut,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    lang,
    setLang,
    currency,
    setCurrency,
    theme,
    toggleTheme,
    currentUser,
    logout,
    setActiveModule,
    t,
  } = useErp();

  const isLight = theme === 'light';

  return (
    <header
      className={`h-16 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors border-b ${
        isLight
          ? 'bg-white border-slate-200 shadow-xs text-slate-800'
          : 'bg-[#080d1c] border-slate-800/80 text-white'
      }`}
    >
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <FinanceLogo className="h-10 w-auto" />
        <div>
          <span className="text-xs text-[#147d9f] font-semibold tracking-wider uppercase">
            Accounting ERP
          </span>
          <p className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {lang === 'ar' ? 'نظام الحسابات والعمليات النيلية المتكامل' : 'Nile Water Activities & Financial Engine'}
          </p>
        </div>
      </div>

      {/* Quick Action Navigation Buttons & Global Stats */}
      <div className="hidden xl:flex items-center gap-2">
        <button
          onClick={() => setActiveModule('trips_catalog')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${
            isLight
              ? 'text-sky-900 bg-sky-50 border-sky-200 hover:bg-[#147d9f] hover:text-white'
              : 'text-sky-300 bg-sky-950/40 border-sky-800/60 hover:bg-[#147d9f] hover:text-white'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-[#147d9f]" />
          <span>{lang === 'ar' ? 'كتالوج الرحلات (10)' : 'Catalog (10)'}</span>
        </button>

        <button
          onClick={() => setActiveModule('tour_profitability')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${
            isLight
              ? 'text-sky-900 bg-sky-50 border-sky-200 hover:bg-[#147d9f] hover:text-white'
              : 'text-sky-300 bg-sky-950/40 border-sky-800/60 hover:bg-[#147d9f] hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-[#147d9f]" />
          <span>{lang === 'ar' ? 'ربحية الرحلات' : 'Tour Profitability'}</span>
        </button>

        <button
          onClick={() => setActiveModule('invoices')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${
            isLight
              ? 'text-slate-700 bg-slate-100 border-slate-200 hover:bg-[#147d9f] hover:text-white'
              : 'text-slate-200 bg-slate-800/80 border-slate-700/60 hover:bg-[#147d9f] hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? '+ فاتورة' : '+ Invoice'}</span>
        </button>

        <button
          onClick={() => setActiveModule('receipts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${
            isLight
              ? 'text-slate-700 bg-slate-100 border-slate-200 hover:bg-[#147d9f] hover:text-white'
              : 'text-slate-200 bg-slate-800/80 border-slate-700/60 hover:bg-[#147d9f] hover:text-white'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? '+ سند قبض' : '+ Receipt'}</span>
        </button>

        <button
          onClick={() => setActiveModule('expenses')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${
            isLight
              ? 'text-slate-700 bg-slate-100 border-slate-200 hover:bg-[#147d9f] hover:text-white'
              : 'text-slate-200 bg-slate-800/80 border-slate-700/60 hover:bg-[#147d9f] hover:text-white'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? '+ سند صرف' : '+ Expense'}</span>
        </button>

        <button
          onClick={() => setActiveModule('acceptance_tests')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-xs transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-[#0c1226]" />
          <span>{lang === 'ar' ? 'فحص دورة المحاسبة (17)' : 'Run 17 Acceptance Tests'}</span>
        </button>
      </div>

      {/* Global Controls: User Role, Currency, Theme, Language */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Signed-in user & logout */}
        <div
          className={`flex items-center gap-2 border rounded px-2.5 py-1 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-[#147d9f]" />
          <div className="text-left">
            <span className={`text-xs font-medium whitespace-nowrap ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              {currentUser.name} ({currentUser.role})
            </span>
          </div>
          <button
            onClick={logout}
            className={`p-0.5 rounded transition-colors ${
              isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
            title={lang === 'ar' ? 'تسجيل الخروج' : 'Log out'}
            aria-label={lang === 'ar' ? 'تسجيل الخروج' : 'Log out'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Currency Switcher */}
        <div
          className={`flex items-center gap-1 border rounded p-0.5 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          {(['EGP', 'USD', 'EUR'] as const).map((curr) => (
            <button
              key={curr}
              onClick={() => setCurrency(curr)}
              className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                currency === curr
                  ? 'bg-[#147d9f] text-white'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {curr}
            </button>
          ))}
        </div>

        {/* Dark / Light Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`p-1.5 rounded border transition-colors flex items-center justify-center ${
            isLight
              ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
              : 'bg-slate-900/90 border-slate-800 text-yellow-300 hover:bg-slate-800'
          }`}
          title={isLight ? 'التبديل إلى الوضع المظلم (Dark Mode)' : 'التبديل إلى الوضع المضيء (Light Mode)'}
          aria-label="Toggle Theme"
        >
          {isLight ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-[#fdfb45]" />}
        </button>

        {/* Language Switcher */}
        <button
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border rounded transition-colors ${
            isLight
              ? 'text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100'
              : 'text-slate-300 bg-slate-900/90 border-slate-800 hover:text-white hover:border-slate-700'
          }`}
          title="Toggle Language"
        >
          <Globe className="w-3.5 h-3.5 text-[#147d9f]" />
          <span>{lang === 'en' ? 'العربية' : 'English'}</span>
        </button>
      </div>
    </header>
  );
};
