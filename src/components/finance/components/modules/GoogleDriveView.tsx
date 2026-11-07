import React, { useState, useEffect } from 'react';
import { useErp } from '../../context/ErpContext';
import {
  initAuth,
  googleSignIn,
  googleLogout,
  getAccessToken,
  testFirestoreConnection,
} from '../../firebase';
import {
  listDriveFiles,
  uploadFileToDrive,
  deleteDriveFile,
  getDriveAbout,
  DriveFileItem,
  DriveQuota,
} from '../../services/googleDriveService';
import {
  HardDrive,
  Cloud,
  Upload,
  Download,
  Trash2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  ShieldCheck,
  FolderSync,
  Database,
  GitBranch,
  Github,
  Terminal,
  Copy,
  Check,
  Layers,
  Scale,
} from 'lucide-react';
import { User } from 'firebase/auth';

export const GoogleDriveView: React.FC = () => {
  const { lang, theme, formatMoney, accounts, invoices, fixedAssets, journalEntries } = useErp();
  const isLight = theme === 'light';
  const isAr = lang === 'ar';

  const [activeTab, setActiveTab] = useState<'drive' | 'github'>('drive');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [storageQuota, setStorageQuota] = useState<DriveQuota | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [uploadingBackup, setUploadingBackup] = useState<string | null>(null);

  // Notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Deletion Confirmation Modal
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // GitHub copy command state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Listen to Auth State
  useEffect(() => {
    testFirestoreConnection();

    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        fetchDriveData(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setDriveFiles([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const fetchDriveData = async (accessToken: string, query?: string) => {
    try {
      setLoadingFiles(true);
      const [files, about] = await Promise.all([
        listDriveFiles(accessToken, query),
        getDriveAbout(accessToken).catch(() => null),
      ]);
      setDriveFiles(files);
      if (about?.storageQuota) {
        setStorageQuota(about.storageQuota);
      }
    } catch (err: any) {
      console.error('Error fetching Drive data:', err);
      setToast({ type: 'error', message: err.message || 'Failed to fetch Google Drive files' });
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setToast({
          type: 'success',
          message: isAr ? 'تم تسجيل الدخول بنجاح مع حساب Google' : 'Signed in with Google successfully',
        });
        fetchDriveData(res.accessToken);
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Login failed' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await googleLogout();
    setUser(null);
    setToken(null);
    setDriveFiles([]);
    setToast({
      type: 'success',
      message: isAr ? 'تم تسجيل الخروج من Google' : 'Logged out of Google',
    });
  };

  // Upload Backups to Google Drive
  const handleUploadBackup = async (type: 'trial_balance' | 'fixed_assets' | 'database' | 'invoices') => {
    if (!token) {
      setToast({ type: 'error', message: isAr ? 'يرجى تسجيل الدخول أولاً' : 'Please sign in first' });
      return;
    }

    try {
      setUploadingBackup(type);
      const dateStr = new Date().toISOString().split('T')[0];
      let fileName = '';
      let content = '';

      if (type === 'trial_balance') {
        fileName = `DUCK_ERP_Trial_Balance_${dateStr}.json`;
        content = JSON.stringify({ exportDate: dateStr, accounts }, null, 2);
      } else if (type === 'fixed_assets') {
        fileName = `DUCK_ERP_Fixed_Assets_${dateStr}.json`;
        content = JSON.stringify({ exportDate: dateStr, fleet: fixedAssets }, null, 2);
      } else if (type === 'invoices') {
        fileName = `DUCK_ERP_Invoices_${dateStr}.json`;
        content = JSON.stringify({ exportDate: dateStr, invoices }, null, 2);
      } else {
        fileName = `DUCK_ERP_Full_Backup_${dateStr}.json`;
        content = JSON.stringify({ exportDate: dateStr, accounts, invoices, fixedAssets, journalEntries }, null, 2);
      }

      await uploadFileToDrive(token, fileName, content, 'application/json');
      setToast({
        type: 'success',
        message: isAr ? `تم حفظ النسخة الاحتياطية (${fileName}) في Google Drive بنجاح` : `Uploaded ${fileName} to Google Drive`,
      });
      fetchDriveData(token);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to upload file to Google Drive' });
    } finally {
      setUploadingBackup(null);
    }
  };

  // Confirm and Delete File
  const handleConfirmDelete = async () => {
    if (!token || !fileToDelete) return;
    try {
      setIsDeleting(true);
      await deleteDriveFile(token, fileToDelete.id);
      setToast({
        type: 'success',
        message: isAr ? `تم حذف الملف (${fileToDelete.name}) من Google Drive` : `File ${fileToDelete.name} deleted`,
      });
      setFileToDelete(null);
      fetchDriveData(token);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to delete file' });
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#147d9f]/20 to-[#4285F4]/20 text-[#4285F4] border border-[#4285F4]/30">
              <Cloud className="w-6 h-6 text-[#4285F4]" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isAr ? 'أرشيف جوجل درايف وربط جيت هب' : 'Google Drive & GitHub Center'}
              </h1>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isAr
                  ? 'النسخ الاحتياطي السحابي التلقائي، مزامنة القوائم المالية مع Google Drive، وإعداد مستودع GitHub'
                  : 'Automated cloud backups, Google Drive synchronization, and GitHub repository integration'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('drive')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'drive'
                ? 'bg-[#4285F4] text-white shadow-sm'
                : isLight
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Google Drive</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'github'
                ? 'bg-[#24292e] text-white shadow-sm'
                : isLight
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Github className="w-4 h-4" />
            <span>GitHub Sync</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="font-bold hover:opacity-80">×</button>
        </div>
      )}

      {/* TAB 1: GOOGLE DRIVE */}
      {activeTab === 'drive' && (
        <div className="space-y-6">
          {/* Authentication & User Status Card */}
          <div
            className={`p-5 rounded-2xl border transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172e] border-slate-800'
            }`}
          >
            {!user ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-[#4285F4]" />
                    <span>{isAr ? 'ربط نظام دك بحساب Google Drive' : 'Connect DUCK ERP to Google Drive'}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr
                      ? 'قم بتسجيل الدخول بحساب Google لتمكين حفظ ومزامنة النسخ الاحتياطية والقوائم المالية تلقائياً في السحابة.'
                      : 'Sign in with your Google account to back up financial data, trial balances, and fleet archives directly to Drive.'}
                  </p>
                </div>

                {/* Official Google Sign-In Button */}
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="inline-flex items-center gap-3 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-semibold shadow-sm hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-60"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{isLoggingIn ? (isAr ? 'جاري الاتصال...' : 'Connecting...') : (isAr ? 'تسجيل الدخول باستخدام Google' : 'Sign in with Google')}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full border border-slate-700" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#4285F4] text-white flex items-center justify-center font-bold">
                      {(user.displayName || user.email || 'G')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{user.displayName || 'Google Account'}</span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        {isAr ? 'متصل بـ Drive' : 'Drive Connected'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">{user.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {storageQuota && (
                    <div className="text-xs text-end hidden md:block">
                      <div className="text-slate-400">{isAr ? 'المساحة المستخدمة:' : 'Storage Quota:'}</div>
                      <div className="font-mono text-slate-200 font-bold">
                        {((Number(storageQuota.usage) || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB / {((Number(storageQuota.limit) || 15 * 1024 * 1024 * 1024) / (1024 * 1024 * 1024)).toFixed(0)} GB
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    {isAr ? 'تسجيل الخروج' : 'Disconnect'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick 1-Click Backup Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => handleUploadBackup('trial_balance')}
              disabled={!user || !!uploadingBackup}
              className={`p-4 rounded-xl border text-start transition-all ${
                !user
                  ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800'
                  : isLight
                  ? 'bg-white border-slate-200 hover:border-[#147d9f] hover:shadow-md'
                  : 'bg-[#0f172e] border-slate-800 hover:border-[#147d9f]'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-[#147d9f]" />
                  {isAr ? 'ميزان المراجعة' : 'Trial Balance'}
                </span>
                <Upload className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                {isAr ? 'نسخ ميزان المراجعة متعدد الأعمدة إلى Drive' : 'Sync 8-column trial balance to Drive'}
              </p>
              <div className="mt-3 text-[10px] font-bold text-[#147d9f]">
                {uploadingBackup === 'trial_balance' ? (isAr ? 'جاري الرفع...' : 'Uploading...') : (isAr ? 'رفع إلى Drive' : 'Upload to Drive')}
              </div>
            </button>

            <button
              onClick={() => handleUploadBackup('fixed_assets')}
              disabled={!user || !!uploadingBackup}
              className={`p-4 rounded-xl border text-start transition-all ${
                !user
                  ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800'
                  : isLight
                  ? 'bg-white border-slate-200 hover:border-[#147d9f] hover:shadow-md'
                  : 'bg-[#0f172e] border-slate-800 hover:border-[#147d9f]'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  {isAr ? 'سجل الأصول والأسطول' : 'Fixed Assets'}
                </span>
                <Upload className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                {isAr ? 'نسخ تفاصيل الأسطول ومجمعات الإهلاك' : 'Sync fleet register & depreciation'}
              </p>
              <div className="mt-3 text-[10px] font-bold text-cyan-400">
                {uploadingBackup === 'fixed_assets' ? (isAr ? 'جاري الرفع...' : 'Uploading...') : (isAr ? 'رفع إلى Drive' : 'Upload to Drive')}
              </div>
            </button>

            <button
              onClick={() => handleUploadBackup('invoices')}
              disabled={!user || !!uploadingBackup}
              className={`p-4 rounded-xl border text-start transition-all ${
                !user
                  ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800'
                  : isLight
                  ? 'bg-white border-slate-200 hover:border-[#147d9f] hover:shadow-md'
                  : 'bg-[#0f172e] border-slate-800 hover:border-[#147d9f]'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  {isAr ? 'سجل الفواتير والمبيعات' : 'Invoices Register'}
                </span>
                <Upload className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                {isAr ? 'نسخ فواتير الرحلات والإيرادات' : 'Sync sales invoices & booking revenues'}
              </p>
              <div className="mt-3 text-[10px] font-bold text-amber-400">
                {uploadingBackup === 'invoices' ? (isAr ? 'جاري الرفع...' : 'Uploading...') : (isAr ? 'رفع إلى Drive' : 'Upload to Drive')}
              </div>
            </button>

            <button
              onClick={() => handleUploadBackup('database')}
              disabled={!user || !!uploadingBackup}
              className={`p-4 rounded-xl border text-start transition-all ${
                !user
                  ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800'
                  : isLight
                  ? 'bg-white border-slate-200 hover:border-[#147d9f] hover:shadow-md'
                  : 'bg-[#0f172e] border-slate-800 hover:border-[#147d9f]'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  {isAr ? 'نسخة قاعدة البيانات الكاملة' : 'Complete ERP Backup'}
                </span>
                <Upload className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                {isAr ? 'لقطة شاملة لكافة القيود والجداول' : 'Full system snapshot to Google Drive'}
              </p>
              <div className="mt-3 text-[10px] font-bold text-emerald-400">
                {uploadingBackup === 'database' ? (isAr ? 'جاري الرفع...' : 'Uploading...') : (isAr ? 'رفع إلى Drive' : 'Upload to Drive')}
              </div>
            </button>
          </div>

          {/* Drive Files List */}
          <div
            className={`rounded-2xl border overflow-hidden transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172e] border-slate-800'
            }`}
          >
            {/* Toolbar */}
            <div
              className={`p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0c142b] border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#4285F4]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  {isAr ? 'ملفات ونسخ Google Drive' : 'Google Drive Files'}
                </h3>
                <span className="text-[10px] text-slate-400">({driveFiles.length} {isAr ? 'ملف' : 'files'})</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full md:w-60">
                  <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={isAr ? 'بحث في ملفات Drive...' : 'Search Drive files...'}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (token) fetchDriveData(token, e.target.value);
                    }}
                    disabled={!user}
                    className={`w-full ps-9 pe-3 py-1.5 rounded-lg text-xs border focus:outline-none ${
                      isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <button
                  onClick={() => token && fetchDriveData(token, searchQuery)}
                  disabled={!user || loadingFiles}
                  className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                  title={isAr ? 'تحديث' : 'Refresh'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Files Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr
                    className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                      isLight ? 'bg-slate-100/70 border-slate-200 text-slate-600' : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <th className="py-3 px-4 text-start">{isAr ? 'اسم الملف' : 'File Name'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'النوع' : 'MIME Type'}</th>
                    <th className="py-3 px-4 text-end">{isAr ? 'الحجم' : 'Size'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'تاريخ التعديل' : 'Modified'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {!user ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                        {isAr ? 'يرجى تسجيل الدخول باستخدام حساب Google لعرض ورفع ملفات Drive' : 'Sign in with Google to view and manage Drive files'}
                      </td>
                    </tr>
                  ) : driveFiles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                        {loadingFiles ? (isAr ? 'جاري التحميل...' : 'Loading...') : (isAr ? 'لا توجد ملفات في Google Drive' : 'No files found')}
                      </td>
                    </tr>
                  ) : (
                    driveFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-200 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#4285F4] shrink-0" />
                          <span className="truncate max-w-xs">{file.name}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">{file.mimeType}</td>
                        <td className="py-3 px-4 text-end font-mono text-slate-300">
                          {file.size ? `${(Number(file.size) / 1024).toFixed(1)} KB` : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {file.modifiedTime ? file.modifiedTime.split('T')[0] : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                title={isAr ? 'فتح في Google Drive' : 'Open in Google Drive'}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => setFileToDelete(file)}
                              className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                              title={isAr ? 'حذف من Drive' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GITHUB SYNC & REPOSITORY GUIDE */}
      {activeTab === 'github' && (
        <div className="space-y-6">
          <div
            className={`p-6 rounded-2xl border transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172e] border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-slate-800 text-white">
                <Github className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'مستودع GitHub وإدارة الإصدارات البرمجية' : 'GitHub Repository Integration'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isAr
                    ? 'خطوات ربط ونقل كود مشروع DUCK ERP بالكامل إلى مستودع GitHub الخاص بك'
                    : 'Step-by-step instructions to link, push, and sync the DUCK ERP codebase with GitHub.'}
                </p>
              </div>
            </div>

            {/* Instructions Cards */}
            <div className="space-y-4">
              {[
                {
                  step: 1,
                  title: isAr ? 'إنشاء مستودع جديد على GitHub' : 'Create a New Repository on GitHub',
                  desc: isAr
                    ? 'توجه إلى حسابك على GitHub وأنشئ مستودعاً جديداً باسم duck-erp'
                    : 'Log in to GitHub and create a new repository named duck-erp (Public or Private).',
                  cmd: 'https://github.com/new',
                },
                {
                  step: 2,
                  title: isAr ? 'ربط المستودع البعيد (Remote Origin)' : 'Add Git Remote Origin',
                  desc: isAr
                    ? 'استبدل USERNAME باسم مستخدم GitHub الخاص بك ثم شغّل الأمر:'
                    : 'Replace USERNAME with your GitHub handle and execute:',
                  cmd: 'git remote add origin https://github.com/USERNAME/duck-erp.git',
                },
                {
                  step: 3,
                  title: isAr ? 'رفع جميع الملفات إلى الفرع الرئيسي (main)' : 'Commit & Push Code',
                  desc: isAr
                    ? 'شغّل الأوامر التالية لحفظ جميع التعديلات ورفعها إلى GitHub:'
                    : 'Execute these commands to commit all ERP modules and push to main:',
                  cmd: 'git add .\ngit commit -m "DUCK ERP: Complete Accounting, Opening Balances & Fleet Engine"\ngit branch -M main\ngit push -u origin main',
                },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#147d9f] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#147d9f]/20 flex items-center justify-center text-[10px]">
                        {item.step}
                      </span>
                      {item.title}
                    </span>
                    <button
                      onClick={() => copyToClipboard(item.cmd, idx)}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-slate-800"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">{isAr ? 'تم النسخ' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{isAr ? 'نسخ' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                  <pre className="p-2.5 rounded-lg bg-black/50 text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                    {item.cmd}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION MODAL FOR DELETING DRIVE FILES */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${
              isLight ? 'bg-white border-slate-300' : 'bg-[#0f172e] border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                {isAr ? 'تأكيد حذف ملف من Google Drive' : 'Confirm Google Drive File Deletion'}
              </h3>
            </div>

            <p className="text-xs text-slate-300">
              {isAr
                ? `هل أنت متأكد من رغبتك في حذف الملف "${fileToDelete.name}" نهائياً من حساب Google Drive الخاص بك؟ هذا الإجراء لا يمكن التراجع عنه.`
                : `Are you sure you want to permanently delete "${fileToDelete.name}" from your Google Drive account? This action cannot be undone.`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 shadow-sm disabled:opacity-60"
              >
                {isDeleting ? (isAr ? 'جاري الحذف...' : 'Deleting...') : (isAr ? 'تأكيد الحذف' : 'Delete File')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
