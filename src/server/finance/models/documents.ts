import type {
  Customer,
  CustomerReceipt,
  ExpenseVoucher,
  Invoice,
  ProviderSettlement,
  PurchaseInvoice,
  Supplier,
} from '@/lib/finance/erp-types';
import { Schema, finOptions, idField, optionalString, sub, type Doc } from './common';

const invoiceLineSchema = new Schema(
  {
    id: { type: String, required: true },
    tourType: { type: String, default: '' },
    service: { type: String, default: '' },
    pax: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    grossAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    captain: { type: String, default: '' },
    notes: optionalString,
    revenueAccountCode: { type: String, default: '4110' },
    costCenter: { type: String, default: '' },
    activity: { type: String, default: '' },
    location: { type: String, default: '' },
  },
  sub,
);

export type InvoiceDoc = Doc<Invoice>;

export const invoiceSchema = new Schema<InvoiceDoc>(
  {
    _id: idField('inv'),
    invoiceNumber: { type: String, required: true, unique: true },
    bookingRef: optionalString,
    date: { type: String, required: true, index: true },
    dueDate: { type: String, required: true },
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: optionalString,
    customerType: { type: String, enum: ['Individual', 'Company'], default: 'Individual' },
    paymentMethod: { type: String, default: '' },
    channel: { type: String, default: '' },
    location: { type: String, default: '' },
    captain: { type: String, default: '' },
    activity: { type: String, default: '' },
    tripType: { type: String, default: '' },
    responsibleEmployee: { type: String, default: '' },
    responsibleAccountant: optionalString,
    lines: { type: [invoiceLineSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'pending_review', 'approved', 'issued', 'partially_paid', 'paid', 'cancelled', 'refunded'],
    },
    notes: optionalString,
    journalEntryId: optionalString,
    approvedAt: optionalString,
    approvedBy: optionalString,
    postedAt: optionalString,
    isLegacyImported: { type: Boolean, default: undefined },
    /** Issued by the Duck booking sync; its payments are recorded in Duck, not here. */
    duckSynced: { type: Boolean, default: undefined },
  },
  finOptions(),
);

export type ReceiptDoc = Doc<CustomerReceipt>;

export const receiptSchema = new Schema<ReceiptDoc>(
  {
    _id: idField('rcp'),
    receiptNumber: { type: String, required: true, unique: true },
    date: { type: String, required: true },
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    invoiceId: { type: String, default: undefined, index: true },
    invoiceNumber: optionalString,
    bookingRef: optionalString,
    amount: { type: Number, required: true },
    currency: { type: String, default: 'EGP' },
    paymentMethod: { type: String, default: 'Cash' },
    receivingAccountCode: { type: String, required: true },
    reference: optionalString,
    notes: optionalString,
    createdBy: { type: String, required: true },
    approvedBy: optionalString,
    status: { type: String, enum: ['draft', 'approved', 'posted'], default: 'posted' },
    journalEntryId: optionalString,
    isLegacyImported: { type: Boolean, default: undefined },
  },
  finOptions(),
);

const expenseLineSchema = new Schema(
  {
    id: optionalString,
    description: { type: String, default: '' },
    categoryId: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    expenseAccountCode: { type: String, default: '' },
    costCenter: { type: String, default: '' },
    activity: optionalString,
    location: optionalString,
  },
  sub,
);

export type ExpenseDoc = Doc<ExpenseVoucher>;

export const expenseSchema = new Schema<ExpenseDoc>(
  {
    _id: idField('exp'),
    voucherNumber: { type: String, required: true, unique: true },
    date: { type: String, required: true },
    beneficiary: { type: String, default: '' },
    paymentMethod: { type: String, default: '' },
    paidFromAccountCode: { type: String, required: true },
    lines: { type: [expenseLineSchema], default: [] },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: 'EGP' },
    relatedActivity: optionalString,
    relatedLocation: optionalString,
    costCenter: optionalString,
    notes: optionalString,
    attachmentName: optionalString,
    createdBy: { type: String, required: true },
    approvedBy: optionalString,
    status: { type: String, enum: ['draft', 'approved', 'posted'], default: 'posted' },
    journalEntryId: optionalString,
    isLegacyImported: { type: Boolean, default: undefined },
  },
  finOptions(),
);

export type CustomerDoc = Doc<Customer>;

export const customerSchema = new Schema<CustomerDoc>(
  {
    _id: idField('c'),
    name: { type: String, required: true },
    nameAr: optionalString,
    phone: { type: String, default: '' },
    email: optionalString,
    nationality: { type: String, default: '' },
    customerType: { type: String, enum: ['Individual', 'Company'], default: 'Individual' },
    address: optionalString,
    notes: optionalString,
    totalBookings: { type: Number, default: 0 },
    totalInvoiced: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  finOptions(),
);

export type SupplierDoc = Doc<Supplier>;

export const supplierSchema = new Schema<SupplierDoc>(
  {
    _id: idField('sup'),
    name: { type: String, required: true },
    nameAr: optionalString,
    type: { type: String, enum: ['Equipment', 'Boat Operator', 'Guest House', 'Maintenance', 'Other'], default: 'Other' },
    contactPerson: optionalString,
    phone: { type: String, default: '' },
    email: optionalString,
    balance: { type: Number, default: 0 },
    notes: optionalString,
    active: { type: Boolean, default: true },
  },
  finOptions(),
);

const purchaseLineSchema = new Schema(
  {
    id: { type: String, required: true },
    description: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    expenseOrAssetAccountCode: { type: String, default: '' },
    costCenter: optionalString,
  },
  sub,
);

export type PurchaseInvoiceDoc = Doc<PurchaseInvoice>;

/** Read-only for now: the Purchases screen is wired in a later session. */
export const purchaseInvoiceSchema = new Schema<PurchaseInvoiceDoc>(
  {
    _id: idField('pinv'),
    invoiceNumber: { type: String, required: true, unique: true },
    supplierId: { type: String, required: true },
    supplierName: { type: String, required: true },
    date: { type: String, required: true },
    dueDate: { type: String, required: true },
    lines: { type: [purchaseLineSchema], default: [] },
    total: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'approved', 'posted', 'paid'], default: 'draft' },
    journalEntryId: optionalString,
    notes: optionalString,
  },
  finOptions(),
);

export type ProviderSettlementDoc = Doc<ProviderSettlement>;

/** Read-only for now: the Provider Settlements screen is wired in a later session. */
export const providerSettlementSchema = new Schema<ProviderSettlementDoc>(
  {
    _id: idField('set'),
    settlementNumber: { type: String, required: true, unique: true },
    providerId: { type: String, required: true },
    providerName: { type: String, required: true },
    periodStart: { type: String, required: true },
    periodEnd: { type: String, required: true },
    totalTrips: { type: Number, default: 0 },
    grossRevenue: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    advancesDeducted: { type: Number, default: 0 },
    netPayable: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'approved', 'paid'], default: 'draft' },
    journalEntryId: optionalString,
    date: { type: String, required: true },
    notes: optionalString,
  },
  finOptions(),
);
