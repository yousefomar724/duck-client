import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useErp } from '../context/ErpContext';
import { FinanceLogo } from './FinanceLogo';
import { Globe, Sun, Moon, LogIn, Lock, User as UserIcon, AlertCircle } from 'lucide-react';

export const FinanceLogin: React.FC = () => {
  const { lang, setLang, theme, toggleTheme, authStatus, login } = useErp();
  const router = useRouter();
  const isLight = theme === 'light';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authStatus === 'authenticated') router.replace('/finance');
  }, [authStatus, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      router.replace('/finance');
    } catch (err: any) {
      setError(err?.message || (lang === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed'));
      setSubmitting(false);
    }
  };

  const inputClass = `w-full rounded border px-3 py-2 text-sm focus:outline-none focus:border-[#147d9f] ${
    isLight
      ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
      : 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500'
  }`;

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#0c1226] text-slate-100'
      }`}
    >
      {/* Theme & language, same controls as the ERP header */}
      <div className="flex items-center justify-end gap-2 sm:gap-3 p-4 lg:px-6">
        <button
          onClick={toggleTheme}
          className={`p-1.5 rounded border transition-colors flex items-center justify-center ${
            isLight
              ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
              : 'bg-slate-900/90 border-slate-800 text-yellow-300 hover:bg-slate-800'
          }`}
          aria-label="Toggle Theme"
        >
          {isLight ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-[#fdfb45]" />}
        </button>
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

      <div className="flex-1 flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className={`w-full max-w-sm p-6 rounded-lg border space-y-5 ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <FinanceLogo className="h-12 w-auto" variant={isLight ? 'light' : 'dark'} />
            <div>
              <span className="text-xs text-[#147d9f] font-semibold tracking-wider uppercase">Accounting ERP</span>
              <p className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {lang === 'ar' ? 'نظام الحسابات والعمليات النيلية المتكامل' : 'Nile Water Activities & Financial Engine'}
              </p>
            </div>
          </div>

          <div className="border-t pb-0 border-slate-800/80" />

          <div className="space-y-1.5 text-xs">
            <label htmlFor="finance-username" className={isLight ? 'block text-slate-600' : 'block text-slate-400'}>
              {lang === 'ar' ? 'اسم المستخدم' : 'Username'}
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-[#147d9f] absolute top-1/2 -translate-y-1/2 start-3" />
              <input
                id="finance-username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`${inputClass} ps-9`}
              />
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <label htmlFor="finance-password" className={isLight ? 'block text-slate-600' : 'block text-slate-400'}>
              {lang === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#147d9f] absolute top-1/2 -translate-y-1/2 start-3" />
              <input
                id="finance-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} ps-9`}
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded p-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-xs transition-colors disabled:opacity-60"
          >
            <LogIn className="w-3.5 h-3.5 text-[#0c1226]" />
            <span>{submitting ? (lang === 'ar' ? 'جارٍ الدخول...' : 'Signing in...') : lang === 'ar' ? 'تسجيل الدخول' : 'Sign in'}</span>
          </button>

          <p className={`text-[11px] text-center ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            {lang === 'ar'
              ? 'الحسابات يُنشئها المدير العام. تواصل معه للحصول على بيانات الدخول.'
              : 'Accounts are created by the Super Admin. Ask them for your login.'}
          </p>
        </form>
      </div>
    </div>
  );
};
