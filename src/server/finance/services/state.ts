import type {
  CostCenter,
  Customer,
  ExpenseCategoryMapping,
  ProviderSettlement,
  PurchaseInvoice,
  Supplier,
} from '@/lib/finance/erp-types';
import { PERMISSIONS, hasPermission } from '../auth/permissions';
import { getAccounts } from './accounts';
import { getAssetCategories, getDepreciationRuns, getFixedAssets } from './assets';
import { getAuditLogs } from './audit';
import type { FinCtx } from './context';
import { getInvoices } from './invoices';
import { getJournalEntries } from './journals';
import { getOpeningBalances } from './opening-balances';
import { getPeriods } from './periods';
import { getCustomerReceipts, getExpenses } from './receipts';
import { getSettings } from './settings';
import { getUserById, listUsers } from './users';
import { toOutList } from './util';

/** How many audit entries `/state` carries; older ones page through `GET /audit-logs`. */
export const STATE_AUDIT_LIMIT = 500;

const oldestFirst = { createdAt: 1 as const, _id: 1 as const };

/**
 * The ERP's whole-database snapshot the screens load on start, now only for
 * signed-in users and trimmed to what they may see: the user list needs
 * `users:manage` (others get just themselves) and the audit trail needs
 * `audit:read`.
 */
export async function getState(ctx: FinCtx) {
  const can = (p: string) => hasPermission(ctx.actor.permissions, p);
  const s = ctx.session;
  const [
    users, accounts, customers, suppliers, invoices, receipts, expenses, journalEntries, fixedAssets,
    costCenters, periods, expenseMappings, purchaseInvoices, providerSettlements, auditLogs, settings,
    openingBalances, assetCategories, depreciationRuns,
  ] = await Promise.all([
    can(PERMISSIONS.usersManage) ? listUsers(ctx) : getUserById(ctx, ctx.actor.id).then((u) => [u]),
    getAccounts(ctx),
    ctx.m.Customer.find().sort(oldestFirst).lean().session(s).then((r) => toOutList<Customer>(r)),
    ctx.m.Supplier.find().sort(oldestFirst).lean().session(s).then((r) => toOutList<Supplier>(r)),
    getInvoices(ctx),
    getCustomerReceipts(ctx),
    getExpenses(ctx),
    getJournalEntries(ctx),
    getFixedAssets(ctx),
    ctx.m.CostCenter.find().sort(oldestFirst).lean().session(s).then((r) => toOutList<CostCenter>(r)),
    getPeriods(ctx),
    ctx.m.ExpenseMapping.find().sort({ sortOrder: 1, createdAt: 1 }).lean().session(s).then((r) => toOutList<ExpenseCategoryMapping>(r)),
    ctx.m.PurchaseInvoice.find().sort({ createdAt: -1 }).lean().session(s).then((r) => toOutList<PurchaseInvoice>(r)),
    ctx.m.ProviderSettlement.find().sort({ createdAt: -1 }).lean().session(s).then((r) => toOutList<ProviderSettlement>(r)),
    can(PERMISSIONS.auditRead) ? getAuditLogs(ctx, { limit: STATE_AUDIT_LIMIT }) : Promise.resolve([]),
    getSettings(ctx),
    getOpeningBalances(ctx),
    getAssetCategories(ctx),
    getDepreciationRuns(ctx),
  ]);

  return {
    users, accounts, customers, suppliers, invoices, receipts, expenses, journalEntries, fixedAssets,
    costCenters, periods, expenseMappings, purchaseInvoices, providerSettlements, auditLogs, settings,
    openingBalances, assetCategories, depreciationRuns,
  };
}
