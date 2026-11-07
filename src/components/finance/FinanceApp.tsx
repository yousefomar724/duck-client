/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useErp } from './context/ErpContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/modules/DashboardView';
import { TripsCatalogView } from './components/modules/TripsCatalogView';
import { BookingsView } from './components/modules/BookingsView';
import { TourProfitabilityView } from './components/modules/TourProfitabilityView';
import { InvoicesView } from './components/modules/InvoicesView';
import { ReceiptsView } from './components/modules/ReceiptsView';
import { ExpensesView } from './components/modules/ExpensesView';
import { PurchasesView } from './components/modules/PurchasesView';
import { CustomersView } from './components/modules/CustomersView';
import { SuppliersView } from './components/modules/SuppliersView';
import { CashAndBanksView } from './components/modules/CashAndBanksView';
import { OpeningBalancesView } from './components/modules/OpeningBalancesView';
import { ChartOfAccountsView } from './components/modules/ChartOfAccountsView';
import { JournalEntriesView } from './components/modules/JournalEntriesView';
import { GeneralLedgerView } from './components/modules/GeneralLedgerView';
import { TrialBalanceView } from './components/modules/TrialBalanceView';
import { FinancialStatementsView } from './components/modules/FinancialStatementsView';
import { FixedAssetsView } from './components/modules/FixedAssetsView';
import { ProviderSettlementsView } from './components/modules/ProviderSettlementsView';
import { CostCentersView } from './components/modules/CostCentersView';
import { ReportsView } from './components/modules/ReportsView';
import { ExcelImportCenterView } from './components/modules/ExcelImportCenterView';
import { AcceptanceTestView } from './components/modules/AcceptanceTestView';
import { InternalControlsView } from './components/modules/InternalControlsView';
import { SettingsView } from './components/modules/SettingsView';
import { AuditLogView } from './components/modules/AuditLogView';
import { GoogleDriveView } from './components/modules/GoogleDriveView';

export const FinanceApp: React.FC = () => {
  const { activeModule, loading, theme, authStatus } = useErp();
  const router = useRouter();
  const isLight = theme === 'light';

  useEffect(() => {
    if (authStatus === 'anonymous') router.replace('/finance/login');
  }, [authStatus, router]);

  if (authStatus !== 'authenticated' || loading) {
    return (
      <div className="min-h-screen bg-[#0c1226] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#147d9f] border-t-[#fdfb45] animate-spin"></div>
        <div className="text-sm font-semibold tracking-wider text-slate-300">
          Initializing DUCK Nile Accounting ERP...
        </div>
      </div>
    );
  }

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardView />;
      case 'trips_catalog':
        return <TripsCatalogView />;
      case 'bookings':
        return <BookingsView />;
      case 'tour_profitability':
        return <TourProfitabilityView />;
      case 'invoices':
        return <InvoicesView />;
      case 'receipts':
        return <ReceiptsView />;
      case 'expenses':
        return <ExpensesView />;
      case 'purchases':
        return <PurchasesView />;
      case 'customers':
        return <CustomersView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'cash_banks':
        return <CashAndBanksView />;
      case 'opening_balances':
        return <OpeningBalancesView />;
      case 'chart_of_accounts':
        return <ChartOfAccountsView />;
      case 'journal_entries':
        return <JournalEntriesView />;
      case 'general_ledger':
        return <GeneralLedgerView />;
      case 'trial_balance':
        return <TrialBalanceView />;
      case 'financial_statements':
        return <FinancialStatementsView />;
      case 'fixed_assets':
        return <FixedAssetsView />;
      case 'provider_settlements':
        return <ProviderSettlementsView />;
      case 'cost_centers':
        return <CostCentersView />;
      case 'reports':
        return <ReportsView />;
      case 'excel_import':
        return <ExcelImportCenterView />;
      case 'acceptance_tests':
        return <AcceptanceTestView />;
      case 'internal_controls':
        return <InternalControlsView />;
      case 'settings':
        return <SettingsView />;
      case 'audit_logs':
        return <AuditLogView />;
      case 'google_drive':
        return <GoogleDriveView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div
      className={`h-dvh overflow-hidden flex flex-col antialiased font-sans transition-colors ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#0c1226] text-slate-100'
      }`}
    >
      <Header />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Sidebar />
        <main
          className={`flex-1 min-h-0 overflow-y-auto p-4 lg:p-6 transition-colors ${
            isLight ? 'bg-slate-50/80 text-slate-900' : 'bg-[#080d1c]/60 text-slate-100'
          }`}
        >
          <div className="max-w-7xl mx-auto">{renderActiveModule()}</div>
        </main>
      </div>
    </div>
  );
};
