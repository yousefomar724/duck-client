'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  apiFetch,
  getFinanceToken,
  setFinanceToken,
  clearFinanceToken,
  FINANCE_API_BASE,
  FINANCE_UNAUTHORIZED_EVENT,
  FINANCE_LOGIN_PATH,
} from '../auth';
import {
  Account,
  Customer,
  Supplier,
  Invoice,
  CustomerReceipt,
  ExpenseVoucher,
  JournalEntry,
  FixedAsset,
  CostCenter,
  AccountingPeriod,
  ExpenseCategoryMapping,
  User,
  UserRole,
  ProviderSettlement,
  PurchaseInvoice,
  AuditLog,
  TrialBalanceItem,
  GeneralLedgerMovement,
  FinancialStatementIncome,
  FinancialStatementBalanceSheet,
  ActivityTypeItem,
  OfficialTripItem,
  BookingItem,
  CustomRoleItem,
  PriceAuditEntry,
  ScheduledPriceChange,
  ServiceItem,
  OpeningBalanceBatch,
  AssetCategoryItem,
  DepreciationRunRecord,
  SubledgerSummaryReport,
  AssetMovementReportItem,
  DepreciationRunItem,
} from '../types/erp';

export type ActiveModule =
  | 'dashboard'
  | 'trips_catalog'
  | 'bookings'
  | 'tour_profitability'
  | 'opening_balances'
  | 'invoices'
  | 'receipts'
  | 'expenses'
  | 'purchases'
  | 'suppliers'
  | 'customers'
  | 'cash_banks'
  | 'chart_of_accounts'
  | 'journal_entries'
  | 'general_ledger'
  | 'trial_balance'
  | 'financial_statements'
  | 'fixed_assets'
  | 'provider_settlements'
  | 'cost_centers'
  | 'reports'
  | 'excel_import'
  | 'internal_controls'
  | 'settings'
  | 'audit_logs'
  | 'acceptance_tests'
  | 'google_drive';

export type Language = 'en' | 'ar';
export type Currency = 'EGP' | 'USD' | 'EUR';
export type Theme = 'dark' | 'light';
export type AuthStatus = 'checking' | 'anonymous' | 'authenticated';

interface ErpContextType {
  activeModule: ActiveModule;
  setActiveModule: (m: ActiveModule) => void;
  lang: Language;
  setLang: (l: Language) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  theme: Theme;
  setTheme: (th: Theme) => void;
  toggleTheme: () => void;
  currentUser: User;
  users: User[];
  authStatus: AuthStatus;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;

  accounts: Account[];
  invoices: Invoice[];
  receipts: CustomerReceipt[];
  expenses: ExpenseVoucher[];
  journalEntries: JournalEntry[];
  customers: Customer[];
  suppliers: Supplier[];
  fixedAssets: FixedAsset[];
  costCenters: CostCenter[];
  periods: AccountingPeriod[];
  expenseMappings: ExpenseCategoryMapping[];
  auditLogs: AuditLog[];
  settings: any;

  openingBalances: OpeningBalanceBatch[];
  assetCategories: AssetCategoryItem[];
  depreciationRuns: DepreciationRunRecord[];

  officialTrips: OfficialTripItem[];
  activityTypes: ActivityTypeItem[];
  bookings: BookingItem[];
  customRoles: CustomRoleItem[];
  services: ServiceItem[];

  loading: boolean;
  refreshData: () => Promise<void>;

  createInvoice: (inv: Partial<Invoice>) => Promise<Invoice>;
  createReceipt: (rcp: Partial<CustomerReceipt>) => Promise<CustomerReceipt>;
  createExpense: (exp: Partial<ExpenseVoucher>) => Promise<ExpenseVoucher>;
  createJournal: (je: any) => Promise<JournalEntry>;
  reverseJournal: (id: string, reason: string) => Promise<JournalEntry>;
  runDepreciation: (assetId: string) => Promise<JournalEntry>;
  lockPeriod: (periodId: string) => Promise<AccountingPeriod>;
  unlockPeriod: (periodId: string) => Promise<AccountingPeriod>;
  createAccount: (acc: Account) => Promise<Account>;
  updateAccount: (code: string, updates: Partial<Account>) => Promise<Account>;
  updateTourTypes: (tourTypes: any[]) => Promise<any>;
  updateCaptains: (captains: any[]) => Promise<any>;
  updateServices: (services: any[]) => Promise<any>;
  updateInternalControls: (controls: any) => Promise<any>;
  updateUserRole: (userId: string, role: UserRole) => Promise<User>;
  createUser: (data: { name: string; username: string; email: string; role: UserRole; password: string }) => Promise<User>;
  resetUserPassword: (userId: string, password: string) => Promise<User>;
  fetchTourProfitability: (startDate?: string, endDate?: string) => Promise<any>;

  createOpeningBalanceBatch: (data: Partial<OpeningBalanceBatch>) => Promise<OpeningBalanceBatch>;
  updateOpeningBalanceBatch: (id: string, data: Partial<OpeningBalanceBatch>) => Promise<OpeningBalanceBatch>;
  postOpeningBalanceBatch: (id: string) => Promise<OpeningBalanceBatch>;
  importOpeningBalances: (id: string, rows: any[]) => Promise<OpeningBalanceBatch>;
  fetchSubledgerSummaries: () => Promise<SubledgerSummaryReport>;

  createFixedAsset: (data: Partial<FixedAsset>) => Promise<FixedAsset>;
  updateFixedAsset: (id: string, data: Partial<FixedAsset>) => Promise<FixedAsset>;
  createAssetCategory: (data: Partial<AssetCategoryItem>) => Promise<AssetCategoryItem>;
  updateAssetCategory: (id: string, data: Partial<AssetCategoryItem>) => Promise<AssetCategoryItem>;
  previewDepreciation: (year: number, month: number) => Promise<DepreciationRunItem[]>;
  executeMonthlyDepreciation: (year: number, month: number) => Promise<{ journal: JournalEntry; count: number; totalDepreciation: number; assets: FixedAsset[] }>;
  disposeFixedAsset: (id: string, data: any) => Promise<FixedAsset>;
  fetchAssetMovementReport: (startDate?: string, endDate?: string) => Promise<AssetMovementReportItem[]>;
  fetchTrialBalance: (startDate?: string, endDate?: string) => Promise<any>;
  fetchGeneralLedger: (accountCode?: string, startDate?: string, endDate?: string, costCenter?: string) => Promise<GeneralLedgerMovement[]>;

  createOfficialTrip: (trip: Partial<OfficialTripItem>) => Promise<OfficialTripItem>;
  updateOfficialTrip: (id: string, updates: Partial<OfficialTripItem>) => Promise<OfficialTripItem>;
  deleteOfficialTrip: (id: string) => Promise<boolean>;
  schedulePriceChange: (tripId: string, change: Partial<ScheduledPriceChange>) => Promise<ScheduledPriceChange>;
  createActivityType: (data: Partial<ActivityTypeItem>) => Promise<ActivityTypeItem>;
  updateActivityType: (id: string, updates: Partial<ActivityTypeItem>) => Promise<ActivityTypeItem>;
  deleteActivityType: (id: string) => Promise<boolean>;
  createBooking: (data: Partial<BookingItem>) => Promise<BookingItem>;
  updateBooking: (id: string, updates: Partial<BookingItem>) => Promise<BookingItem>;
  convertBookingToInvoice: (bookingId: string) => Promise<Invoice>;
  createCustomRole: (data: Partial<CustomRoleItem>) => Promise<CustomRoleItem>;
  updateCustomRole: (id: string, updates: Partial<CustomRoleItem>) => Promise<CustomRoleItem>;
  deleteCustomRole: (id: string) => Promise<boolean>;
  createService: (data: Partial<ServiceItem>) => Promise<ServiceItem>;
  deleteService: (id: string) => Promise<boolean>;

  formatMoney: (amount: number) => string;
  t: (key: string) => string;
}

const ErpContext = createContext<ErpContextType | null>(null);

// Placeholder shown to child components before sign-in resolves. Nothing
// renders against it: the shell only mounts the modules once authenticated.
const SIGNED_OUT_USER: User = {
  id: '',
  username: '',
  name: '',
  email: '',
  role: 'Auditor',
  active: false,
};

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    appName: 'DUCK Accounting System',
    appSubtitle: 'Nile Water Activities ERP',
    dashboard: 'Dashboard',
    tourProfitability: 'Transactions & Tour Profitability',
    openingBalances: 'Opening Balances Module',
    invoices: 'Sales & Invoices',
    receipts: 'Customer Receipts',
    expenses: 'Expenses & Vouchers',
    purchases: 'Purchases & Payables',
    suppliers: 'Suppliers & Providers',
    customers: 'Customers Directory',
    cashBanks: 'Cash & Banks',
    chartOfAccounts: 'Chart of Accounts',
    journalEntries: 'Journal Entries',
    generalLedger: 'General Ledger',
    trialBalance: 'Trial Balance',
    financialStatements: 'Financial Statements',
    fixedAssets: 'Fixed Assets',
    providerSettlements: 'Provider Settlements',
    costCenters: 'Cost Centers',
    reports: 'Accounting Reports',
    excelImport: 'Excel Import Center',
    internalControls: 'Internal Controls & Governance',
    settings: 'Settings & Periods',
    auditLogs: 'Audit Trail',
    acceptanceTests: 'Acceptance Tests (17)',
    googleDrive: 'Google Drive & GitHub Sync',

    totalRevenue: 'Total Revenue',
    netProfit: 'Net Profit',
    receivables: 'Outstanding Receivables',
    cashAndBanks: 'Cash & Bank Balances',
    newInvoice: 'New Invoice',
    newReceipt: 'New Receipt',
    newExpense: 'New Expense',
    newJournal: 'New Journal',
    all: 'All',
    draft: 'Draft',
    approved: 'Approved',
    issued: 'Issued',
    partiallyPaid: 'Partially Paid',
    paid: 'Paid',
    search: 'Search...',
    date: 'Date',
    amount: 'Amount',
    status: 'Status',
    actions: 'Actions',
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Balance',
    save: 'Save',
    cancel: 'Cancel',
    print: 'Print',
    export: 'Export',
    periodLock: 'Period Lock',
    open: 'Open',
    closed: 'Closed',
    locked: 'Locked',
    runTests: 'Run 17-Step Test Suite',
    verifyBalanced: 'Debits = Credits Verified',
    theme: 'Theme',
    dark: 'Dark Mode',
    light: 'Light Mode',
  },
  ar: {
    appName: 'نظام دك المحاسبي المتكامل',
    appSubtitle: 'إدارة العمليات والأنشطة النيلية',
    dashboard: 'لوحة المؤشرات العامة',
    tourProfitability: 'المعاملات وربحية أنواع الرحلات',
    openingBalances: 'نظام الأرصدة الافتتاحية',
    invoices: 'المبيعات والفواتير',
    receipts: 'سندات قبض العملاء',
    expenses: 'المصروفات وسندات الصرف',
    purchases: 'المشتريات والموردين',
    suppliers: 'الموردون ومقدمو الخدمات',
    customers: 'دليل وبيانات العملاء',
    cashBanks: 'الخزينة والبنوك والمحافظ',
    chartOfAccounts: 'دليل الحسابات (الشجرة)',
    journalEntries: 'قيود اليومية المحاسبية',
    generalLedger: 'دفتر الأستاذ العام',
    trialBalance: 'ميزان المراجعة',
    financialStatements: 'القوائم المالية والختامية',
    fixedAssets: 'سجل الأصول الثابتة والإهلاك',
    providerSettlements: 'تسويات الكباتن والمراكبية',
    costCenters: 'مراكز التكلفة والأنشطة',
    reports: 'التقارير المحاسبية التحليلية',
    excelImport: 'مركز استيراد ومراجعة إكسيل',
    internalControls: 'التحكم الداخلي والحوكمة',
    settings: 'الإعدادات وإقفال الفترات',
    auditLogs: 'سجل التدقيق والأمان',
    acceptanceTests: 'اختبارات القبول (17 خطوة)',
    googleDrive: 'أرشيف جوجل درايف ومستودع GitHub',

    totalRevenue: 'إجمالي الإيرادات',
    netProfit: 'صافي أرباح الفترة',
    receivables: 'مستحقات العملاء المدينين',
    cashAndBanks: 'أرصدة الخزينة والبنوك',
    newInvoice: 'فاتورة مبيعات جديدة',
    newReceipt: 'سند قبض جديد',
    newExpense: 'سند صرف مصروفات',
    newJournal: 'قيد يومية يدوي',
    all: 'الكل',
    draft: 'مسودة',
    approved: 'معتمدة',
    issued: 'صادرة',
    partiallyPaid: 'مدفوعة جزئياً',
    paid: 'مدفوعة بالكامل',
    search: 'بحث...',
    date: 'التاريخ',
    amount: 'المبلغ',
    status: 'الحالة',
    actions: 'الإجراءات',
    debit: 'مدين',
    credit: 'دائن',
    balance: 'الرصيد',
    save: 'حفظ',
    cancel: 'إلغاء',
    print: 'طباعة',
    export: 'تصدير إكسيل',
    periodLock: 'إقفال الفترات',
    open: 'مفتوحة',
    closed: 'مغلقة',
    locked: 'مقيدة نهائياً',
    runTests: 'تشغيل دورة الاختبارات الـ 17',
    verifyBalanced: 'تطابق المدين والدائن 100%',
    theme: 'المظهر',
    dark: 'الوضع الداكن',
    light: 'الوضع الفاتح',
  },
};

export const ErpProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeModule, setActiveModule] = useState<ActiveModule>('dashboard');
  const [lang, setLang] = useState<Language>('ar'); // Default to Arabic as requested
  const [currency, setCurrency] = useState<Currency>('EGP');
  const [theme, setTheme] = useState<Theme>('dark');

  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>(SIGNED_OUT_USER);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<CustomerReceipt[]>([]);
  const [expenses, setExpenses] = useState<ExpenseVoucher[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [openingBalances, setOpeningBalances] = useState<OpeningBalanceBatch[]>([]);
  const [assetCategories, setAssetCategories] = useState<AssetCategoryItem[]>([]);
  const [depreciationRuns, setDepreciationRuns] = useState<DepreciationRunRecord[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [expenseMappings, setExpenseMappings] = useState<ExpenseCategoryMapping[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const applyState = (state: any) => {
    setUsers(state.users || []);
    const me = (state.users || []).find((u: User) => u.id === currentUser.id);
    if (me) setCurrentUser(me);
    setAccounts(state.accounts || []);
    setInvoices(state.invoices || []);
    setReceipts(state.receipts || []);
    setExpenses(state.expenses || []);
    setJournalEntries(state.journalEntries || []);
    setCustomers(state.customers || []);
    setSuppliers(state.suppliers || []);
    setFixedAssets(state.fixedAssets || []);
    setOpeningBalances(state.openingBalances || []);
    setAssetCategories(state.assetCategories || []);
    setDepreciationRuns(state.depreciationRuns || []);
    setCostCenters(state.costCenters || []);
    setPeriods(state.periods || []);
    setExpenseMappings(state.expenseMappings || []);
    setAuditLogs(state.auditLogs || []);
    setSettings(state.settings || {});
  };

  const refreshData = async () => {
    try {
      const res = await apiFetch('/state');
      if (res.ok) {
        applyState(await res.json());
      }
    } catch (err) {
      console.error('Error fetching ERP state:', err);
    } finally {
      setLoading(false);
    }
  };

  const enterSession = async (user: User) => {
    setCurrentUser(user);
    setAuthStatus('authenticated');
    setLoading(true);
    try {
      const res = await apiFetch('/state');
      if (res.ok) applyState(await res.json());
    } catch (err) {
      console.error('Error fetching ERP state:', err);
    } finally {
      setLoading(false);
    }
  };

  const signOutLocally = () => {
    clearFinanceToken();
    setCurrentUser(SIGNED_OUT_USER);
    setAuthStatus('anonymous');
    setLoading(true);
  };

  // Restore the session from the stored token on first load.
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      if (!getFinanceToken()) {
        setAuthStatus('anonymous');
        return;
      }
      try {
        const res = await apiFetch('/auth/me');
        if (cancelled) return;
        if (!res.ok) {
          signOutLocally();
          return;
        }
        const { user } = await res.json();
        await enterSession(user);
      } catch {
        // Backend unreachable: keep the stored token and ask to sign in.
        if (!cancelled) setAuthStatus('anonymous');
      }
    };
    restore();
    const onUnauthorized = () => signOutLocally();
    window.addEventListener(FINANCE_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => {
      cancelled = true;
      window.removeEventListener(FINANCE_UNAUTHORIZED_EVENT, onUnauthorized);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    const res = await fetch(`${FINANCE_API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.error || 'Login failed');
    }
    setFinanceToken(body.token);
    await enterSession(body.user);
  };

  const logout = () => {
    signOutLocally();
    window.location.assign(FINANCE_LOGIN_PATH);
  };

  const createInvoice = async (inv: Partial<Invoice>): Promise<Invoice> => {
    const res = await apiFetch('/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' },
      body: JSON.stringify(inv),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create invoice');
    }
    const created = await res.json();
    await refreshData();
    return created;
  };

  const createReceipt = async (rcp: Partial<CustomerReceipt>): Promise<CustomerReceipt> => {
    const res = await apiFetch('/customer-receipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' },
      body: JSON.stringify(rcp),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create receipt');
    }
    const created = await res.json();
    await refreshData();
    return created;
  };

  const createExpense = async (exp: Partial<ExpenseVoucher>): Promise<ExpenseVoucher> => {
    const res = await apiFetch('/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' },
      body: JSON.stringify(exp),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create expense voucher');
    }
    const created = await res.json();
    await refreshData();
    return created;
  };

  const createJournal = async (je: any): Promise<JournalEntry> => {
    const res = await apiFetch('/journal-entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' },
      body: JSON.stringify(je),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create journal entry');
    }
    const created = await res.json();
    await refreshData();
    return created;
  };

  const reverseJournal = async (id: string, reason: string): Promise<JournalEntry> => {
    const res = await apiFetch(`/journal-entries/${id}/reverse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reverse journal entry');
    }
    const reversed = await res.json();
    await refreshData();
    return reversed;
  };

  const runDepreciation = async (assetId: string): Promise<JournalEntry> => {
    const res = await apiFetch(`/fixed-assets/${assetId}/depreciate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to post depreciation');
    }
    const journal = await res.json();
    await refreshData();
    return journal;
  };

  const lockPeriod = async (periodId: string): Promise<AccountingPeriod> => {
    const res = await apiFetch(`/periods/${periodId}/lock`, {
      method: 'POST',
      });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to lock period');
    }
    const period = await res.json();
    await refreshData();
    return period;
  };

  const unlockPeriod = async (periodId: string): Promise<AccountingPeriod> => {
    const res = await apiFetch(`/periods/${periodId}/unlock`, {
      method: 'POST',
      });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to unlock period');
    }
    const period = await res.json();
    await refreshData();
    return period;
  };

  const createAccount = async (acc: Account): Promise<Account> => {
    const res = await apiFetch('/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' },
      body: JSON.stringify(acc),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create account');
    }
    const created = await res.json();
    await refreshData();
    return created;
  };

  const updateAccount = async (code: string, updates: Partial<Account>): Promise<Account> => {
    const res = await apiFetch(`/accounts/${code}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update account');
    }
    const updated = await res.json();
    await refreshData();
    return updated;
  };

  const updateTourTypes = async (tourTypes: any[]): Promise<any> => {
    const res = await apiFetch('/settings/tour-types', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json' },
      body: JSON.stringify({ tourTypes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update tour types');
    }
    const updated = await res.json();
    await refreshData();
    return updated;
  };

  const updateCaptains = async (captains: any[]): Promise<any> => {
    const res = await apiFetch('/settings/captains', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json' },
      body: JSON.stringify({ captains }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update captains');
    }
    const updated = await res.json();
    await refreshData();
    return updated;
  };

  const updateServices = async (services: any[]): Promise<any> => {
    const res = await apiFetch('/settings/services', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json' },
      body: JSON.stringify({ services }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update services');
    }
    const updated = await res.json();
    await refreshData();
    return updated;
  };

  const updateInternalControls = async (controls: any): Promise<any> => {
    const res = await apiFetch('/settings/internal-controls', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json' },
      body: JSON.stringify(controls),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update internal controls');
    }
    const updated = await res.json();
    await refreshData();
    return updated;
  };

  const updateUserRole = async (userId: string, role: UserRole): Promise<User> => {
    const res = await apiFetch(`/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update user role');
    }
    const updated = await res.json();
    await refreshData();
    return updated;
  };

  const createUser = async (data: {
    name: string;
    username: string;
    email: string;
    role: UserRole;
    password: string;
  }): Promise<User> => {
    const res = await apiFetch('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create user');
    }
    const created = await res.json();
    await refreshData();
    return created;
  };

  const resetUserPassword = async (userId: string, password: string): Promise<User> => {
    const res = await apiFetch(`/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reset password');
    }
    return res.json();
  };

  const fetchTourProfitability = async (startDate?: string, endDate?: string): Promise<any> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const res = await apiFetch(`/tour-profitability?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Failed to fetch tour profitability');
    }
    return await res.json();
  };

  const officialTrips: OfficialTripItem[] = settings?.officialTrips || [];
  const activityTypes: ActivityTypeItem[] = settings?.activityTypes || [];
  const bookings: BookingItem[] = settings?.bookings || [];
  const customRoles: CustomRoleItem[] = settings?.customRoles || [];
  const services: ServiceItem[] = settings?.services || [];

  const createOfficialTrip = async (trip: Partial<OfficialTripItem>): Promise<OfficialTripItem> => {
    const res = await apiFetch('/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trip),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create official trip');
    }
    const created = await res.json();
    await refreshData();
    return created;
  };

  const updateOfficialTrip = async (id: string, updates: Partial<OfficialTripItem>): Promise<OfficialTripItem> => {
    const res = await apiFetch(`/trips/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update official trip');
    }
    const updated = await res.json();
    await refreshData();
    return updated;
  };

  const deleteOfficialTrip = async (id: string): Promise<boolean> => {
    const res = await apiFetch(`/trips/${id}`, {
      method: 'DELETE',
      });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete official trip');
    }
    await refreshData();
    return true;
  };

  const schedulePriceChange = async (tripId: string, change: Partial<ScheduledPriceChange>): Promise<ScheduledPriceChange> => {
    const res = await apiFetch(`/trips/${tripId}/schedule-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(change),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to schedule price change');
    }
    const scheduled = await res.json();
    await refreshData();
    return scheduled;
  };

  const createActivityType = async (data: Partial<ActivityTypeItem>): Promise<ActivityTypeItem> => {
    const res = await apiFetch('/activity-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create activity type');
    }
    const created = await res.json();
    await refreshData();
    return created;
  };

  const updateActivityType = async (id: string, updates: Partial<ActivityTypeItem>): Promise<ActivityTypeItem> => {
    const res = await apiFetch(`/activity-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update activity type');
    }
    const updated = await res.json();
    await refreshData();
    return updated;
  };

  const deleteActivityType = async (id: string): Promise<boolean> => {
    const res = await apiFetch(`/activity-types/${id}`, {
      method: 'DELETE',
      });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete activity type');
    }
    await refreshData();
    return true;
  };

  const createBooking = async (data: Partial<BookingItem>): Promise<BookingItem> => {
    const res = await apiFetch('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create booking');
    }
    const created = await res.json();
    await refreshData();
    return created;
  };

  const updateBooking = async (id: string, updates: Partial<BookingItem>): Promise<BookingItem> => {
    const res = await apiFetch(`/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update booking');
    }
    const updated = await res.json();
    await refreshData();
    return updated;
  };

  const convertBookingToInvoice = async (bookingId: string): Promise<Invoice> => {
    const res = await apiFetch(`/bookings/${bookingId}/convert-to-invoice`, {
      method: 'POST',
      });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to convert booking to invoice');
    }
    const invoice = await res.json();
    await refreshData();
    return invoice;
  };

  const createCustomRole = async (data: Partial<CustomRoleItem>): Promise<CustomRoleItem> => {
    const res = await apiFetch('/custom-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create custom role');
    }
    const created = await res.json();
    await refreshData();
    return created;
  };

  const updateCustomRole = async (id: string, updates: Partial<CustomRoleItem>): Promise<CustomRoleItem> => {
    const res = await apiFetch(`/custom-roles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update custom role');
    }
    const updated = await res.json();
    await refreshData();
    return updated;
  };

  const deleteCustomRole = async (id: string): Promise<boolean> => {
    const res = await apiFetch(`/custom-roles/${id}`, {
      method: 'DELETE',
      });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete custom role');
    }
    await refreshData();
    return true;
  };

  const createService = async (data: Partial<ServiceItem>): Promise<ServiceItem> => {
    const res = await apiFetch('/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create service');
    }
    const created = await res.json();
    await refreshData();
    return created;
  };

  const deleteService = async (id: string): Promise<boolean> => {
    const res = await apiFetch(`/services/${id}`, {
      method: 'DELETE',
      });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete service');
    }
    await refreshData();
    return true;
  };

  const createOpeningBalanceBatch = async (data: Partial<OpeningBalanceBatch>): Promise<OpeningBalanceBatch> => {
    const res = await apiFetch('/opening-balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create opening balance batch');
    }
    const created = await res.json();
    await refreshData();
    return created;
  };

  const updateOpeningBalanceBatch = async (id: string, data: Partial<OpeningBalanceBatch>): Promise<OpeningBalanceBatch> => {
    const res = await apiFetch(`/opening-balances/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update opening balances');
    }
    const updated = await res.json();
    await refreshData();
    return updated;
  };

  const postOpeningBalanceBatch = async (id: string): Promise<OpeningBalanceBatch> => {
    const res = await apiFetch(`/opening-balances/${id}/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to post opening balances');
    }
    const posted = await res.json();
    await refreshData();
    return posted;
  };

  const importOpeningBalances = async (id: string, rows: any[]): Promise<OpeningBalanceBatch> => {
    const res = await apiFetch(`/opening-balances/${id}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to import opening balance rows');
    }
    const result = await res.json();
    await refreshData();
    return result;
  };

  const fetchSubledgerSummaries = async (): Promise<SubledgerSummaryReport> => {
    const res = await apiFetch('/opening-balances-subledgers', {
      });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch subledger summaries');
    }
    return res.json();
  };

  const createFixedAsset = async (data: Partial<FixedAsset>): Promise<FixedAsset> => {
    const res = await apiFetch('/fixed-assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create fixed asset');
    }
    const created = await res.json();
    await refreshData();
    return created;
  };

  const updateFixedAsset = async (id: string, data: Partial<FixedAsset>): Promise<FixedAsset> => {
    const res = await apiFetch(`/fixed-assets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update fixed asset');
    }
    const updated = await res.json();
    await refreshData();
    return updated;
  };

  const createAssetCategory = async (data: Partial<AssetCategoryItem>): Promise<AssetCategoryItem> => {
    const res = await apiFetch('/asset-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create asset category');
    }
    const created = await res.json();
    await refreshData();
    return created;
  };

  const updateAssetCategory = async (id: string, data: Partial<AssetCategoryItem>): Promise<AssetCategoryItem> => {
    const res = await apiFetch(`/asset-categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update asset category');
    }
    const updated = await res.json();
    await refreshData();
    return updated;
  };

  const previewDepreciation = async (year: number, month: number): Promise<DepreciationRunItem[]> => {
    const res = await apiFetch(`/fixed-assets/depreciation/preview?year=${year}&month=${month}`, {
      });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to preview depreciation');
    }
    return res.json();
  };

  const executeMonthlyDepreciation = async (year: number, month: number): Promise<{ journal: JournalEntry; count: number; totalDepreciation: number; assets: FixedAsset[] }> => {
    const res = await apiFetch('/fixed-assets/depreciation/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to execute monthly depreciation');
    }
    const result = await res.json();
    await refreshData();
    return result;
  };

  const disposeFixedAsset = async (id: string, data: any): Promise<FixedAsset> => {
    const res = await apiFetch(`/fixed-assets/${id}/dispose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to dispose/sell asset');
    }
    const result = await res.json();
    await refreshData();
    return result;
  };

  const fetchAssetMovementReport = async (startDate?: string, endDate?: string): Promise<AssetMovementReportItem[]> => {
    let url = '/fixed-assets/reports/movement';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await apiFetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch asset movement report');
    }
    return res.json();
  };

  const fetchTrialBalance = async (startDate?: string, endDate?: string): Promise<any> => {
    let url = '/trial-balance';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await apiFetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch trial balance');
    }
    return res.json();
  };

  const fetchGeneralLedger = async (accountCode?: string, startDate?: string, endDate?: string, costCenter?: string): Promise<GeneralLedgerMovement[]> => {
    let url = '/general-ledger';
    const params = new URLSearchParams();
    if (accountCode) params.append('accountCode', accountCode);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (costCenter) params.append('costCenter', costCenter);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await apiFetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch general ledger');
    }
    return res.json();
  };

  const formatMoney = (amount: number): string => {
    const rate = currency === 'USD' ? 0.02 : currency === 'EUR' ? 0.019 : 1;
    const symbol = currency === 'EGP' ? (lang === 'ar' ? 'ج.م' : 'EGP') : currency === 'USD' ? '$' : '€';
    const val = (amount || 0) * rate;
    return `${val.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
  };

  const t = (key: string): string => {
    return TRANSLATIONS[lang][key] || key;
  };

  return (
    <ErpContext.Provider
      value={{
        activeModule,
        setActiveModule,
        lang,
        setLang,
        currency,
        setCurrency,
        theme,
        setTheme,
        toggleTheme,
        currentUser,
        users,
        authStatus,
        login,
        logout,
        accounts,
        invoices,
        receipts,
        expenses,
        journalEntries,
        customers,
        suppliers,
        fixedAssets,
        openingBalances,
        assetCategories,
        depreciationRuns,
        costCenters,
        periods,
        expenseMappings,
        auditLogs,
        settings,
        officialTrips,
        activityTypes,
        bookings,
        customRoles,
        services,
        loading,
        refreshData,
        createInvoice,
        createReceipt,
        createExpense,
        createJournal,
        reverseJournal,
        runDepreciation,
        lockPeriod,
        unlockPeriod,
        createAccount,
        updateAccount,
        updateTourTypes,
        updateCaptains,
        updateServices,
        updateInternalControls,
        updateUserRole,
        createUser,
        resetUserPassword,
        fetchTourProfitability,
        createOpeningBalanceBatch,
        updateOpeningBalanceBatch,
        postOpeningBalanceBatch,
        importOpeningBalances,
        fetchSubledgerSummaries,
        createFixedAsset,
        updateFixedAsset,
        createAssetCategory,
        updateAssetCategory,
        previewDepreciation,
        executeMonthlyDepreciation,
        disposeFixedAsset,
        fetchAssetMovementReport,
        fetchTrialBalance,
        fetchGeneralLedger,
        createOfficialTrip,
        updateOfficialTrip,
        deleteOfficialTrip,
        schedulePriceChange,
        createActivityType,
        updateActivityType,
        deleteActivityType,
        createBooking,
        updateBooking,
        convertBookingToInvoice,
        createCustomRole,
        updateCustomRole,
        deleteCustomRole,
        createService,
        deleteService,
        formatMoney,
        t,
      }}
    >
      {/*
        The ERP used to set dir/lang and the body classes on <html>/<body>.
        Here they live on this wrapper so nothing leaks into the rest of the
        Duck site. `data-theme` is deliberately not the `dark` class: Duck's
        own dark variants key off that class.
      */}
      <div
        className={`finance-root font-sans antialiased selection:bg-[#147d9f] selection:text-white ${
          theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-[#0c1226] text-slate-100'
        }`}
        data-theme={theme}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        lang={lang}
      >
        {children}
      </div>
    </ErpContext.Provider>
  );
};

export const useErp = () => {
  const context = useContext(ErpContext);
  if (!context) throw new Error('useErp must be used within ErpProvider');
  return context;
};
