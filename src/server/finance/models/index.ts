import mongoose, { type Connection, type Model, type Schema } from 'mongoose';
import {
  accountSchema,
  auditLogSchema,
  costCenterSchema,
  counterSchema,
  journalEntrySchema,
  metaSchema,
  periodSchema,
} from './accounting';
import {
  customerSchema,
  expenseSchema,
  invoiceSchema,
  providerSettlementSchema,
  purchaseInvoiceSchema,
  receiptSchema,
  supplierSchema,
} from './documents';
import { assetCategorySchema, depreciationRunSchema, fixedAssetSchema, openingBalanceSchema } from './assets';
import {
  activityTypeSchema,
  bookingSchema,
  captainSchema,
  channelSchema,
  customRoleSchema,
  expenseMappingSchema,
  internalControlsSchema,
  locationSchema,
  paymentMethodSchema,
  serviceSchema,
  tourTypeSchema,
  tripSchema,
} from './settings';
import { finUserSchema } from './users';

export const FINANCE_PREFIX = 'fin_';

function make<T>(conn: Connection, prefix: string, name: string, collection: string, schema: Schema<T>): Model<T> {
  const modelName = `${prefix}${name}`;
  return (conn.models[modelName] as Model<T> | undefined) ?? conn.model<T>(modelName, schema, `${prefix}${collection}`);
}

function build(conn: Connection, prefix: string) {
  return {
    Account: make(conn, prefix, 'Account', 'accounts', accountSchema),
    JournalEntry: make(conn, prefix, 'JournalEntry', 'journal_entries', journalEntrySchema),
    Period: make(conn, prefix, 'Period', 'periods', periodSchema),
    CostCenter: make(conn, prefix, 'CostCenter', 'cost_centers', costCenterSchema),
    AuditLog: make(conn, prefix, 'AuditLog', 'audit_logs', auditLogSchema),
    Counter: make(conn, prefix, 'Counter', 'counters', counterSchema),
    Meta: make(conn, prefix, 'Meta', 'meta', metaSchema),
    Invoice: make(conn, prefix, 'Invoice', 'invoices', invoiceSchema),
    Receipt: make(conn, prefix, 'Receipt', 'customer_receipts', receiptSchema),
    Expense: make(conn, prefix, 'Expense', 'expenses', expenseSchema),
    Customer: make(conn, prefix, 'Customer', 'customers', customerSchema),
    Supplier: make(conn, prefix, 'Supplier', 'suppliers', supplierSchema),
    PurchaseInvoice: make(conn, prefix, 'PurchaseInvoice', 'purchase_invoices', purchaseInvoiceSchema),
    ProviderSettlement: make(conn, prefix, 'ProviderSettlement', 'provider_settlements', providerSettlementSchema),
    FixedAsset: make(conn, prefix, 'FixedAsset', 'fixed_assets', fixedAssetSchema),
    AssetCategory: make(conn, prefix, 'AssetCategory', 'asset_categories', assetCategorySchema),
    DepreciationRun: make(conn, prefix, 'DepreciationRun', 'depreciation_runs', depreciationRunSchema),
    OpeningBalance: make(conn, prefix, 'OpeningBalance', 'opening_balances', openingBalanceSchema),
    ExpenseMapping: make(conn, prefix, 'ExpenseMapping', 'expense_mappings', expenseMappingSchema),
    PaymentMethod: make(conn, prefix, 'PaymentMethod', 'payment_methods', paymentMethodSchema),
    Channel: make(conn, prefix, 'Channel', 'channels', channelSchema),
    Location: make(conn, prefix, 'Location', 'locations', locationSchema),
    TourType: make(conn, prefix, 'TourType', 'tour_types', tourTypeSchema),
    Captain: make(conn, prefix, 'Captain', 'captains', captainSchema),
    Service: make(conn, prefix, 'Service', 'services', serviceSchema),
    ActivityType: make(conn, prefix, 'ActivityType', 'activity_types', activityTypeSchema),
    CustomRole: make(conn, prefix, 'CustomRole', 'custom_roles', customRoleSchema),
    InternalControls: make(conn, prefix, 'InternalControls', 'settings', internalControlsSchema),
    Trip: make(conn, prefix, 'Trip', 'trips', tripSchema),
    Booking: make(conn, prefix, 'Booking', 'bookings', bookingSchema),
    User: make(conn, prefix, 'User', 'users', finUserSchema),
  };
}

export type FinanceModels = ReturnType<typeof build>;

const cache = new WeakMap<Connection, Map<string, FinanceModels>>();

/**
 * The finance models bound to `conn`, with every collection named
 * `<prefix><name>`. Production uses the default connection and `fin_`; the
 * acceptance-test runner binds a throwaway prefix so it never touches the
 * real books.
 */
export function getFinanceModels(conn: Connection = mongoose.connection, prefix = FINANCE_PREFIX): FinanceModels {
  let byPrefix = cache.get(conn);
  if (!byPrefix) {
    byPrefix = new Map();
    cache.set(conn, byPrefix);
  }
  let models = byPrefix.get(prefix);
  if (!models) {
    models = build(conn, prefix);
    byPrefix.set(prefix, models);
  }
  return models;
}

/** Drops a model set from the connection's registry (after dropping its collections). */
export function forgetFinanceModels(conn: Connection, prefix: string) {
  const models = cache.get(conn)?.get(prefix);
  if (!models) return;
  for (const model of Object.values(models)) conn.deleteModel(model.modelName);
  cache.get(conn)?.delete(prefix);
}
