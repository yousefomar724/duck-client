import type {
  AssetCategoryItem,
  DepreciationRunRecord,
  FixedAsset,
  OpeningBalanceBatch,
} from '@/lib/finance/erp-types';
import { Schema, finOptions, idField, optionalString, sub, type Doc } from './common';

const disposalSchema = new Schema(
  {
    date: { type: String, required: true },
    type: { type: String, enum: ['Sale', 'Disposal', 'Scrap'], required: true },
    saleProceeds: { type: Number, default: 0 },
    realizedGainLoss: { type: Number, default: 0 },
    receivingAccountCode: optionalString,
    journalEntryId: optionalString,
    journalNumber: optionalString,
    reason: optionalString,
  },
  sub,
);

export type FixedAssetDoc = Doc<FixedAsset>;

export const fixedAssetSchema = new Schema<FixedAssetDoc>(
  {
    _id: idField('ast'),
    assetId: { type: String, required: true, unique: true },
    assetCode: optionalString,
    nameAr: { type: String, default: '' },
    nameEn: { type: String, default: '' },
    category: { type: String, default: '' },
    trackingMethod: { type: String, enum: ['Individual', 'Bulk'], default: 'Individual' },
    quantity: { type: Number, default: 1 },
    purchaseDate: { type: String, required: true },
    inServiceDate: optionalString,
    supplier: optionalString,
    supplierId: optionalString,
    invoiceRef: optionalString,
    unitCost: { type: Number, default: 0 },
    totalAcquisitionCost: { type: Number, default: 0 },
    acquisitionCost: { type: Number, default: 0 },
    usefulLifeMonths: { type: Number, default: 36 },
    depreciationMethod: { type: String, default: 'Straight Line' },
    residualValue: { type: Number, default: 0 },
    accumulatedDepreciation: { type: Number, default: 0 },
    netBookValue: { type: Number, default: 0 },
    assetAccountCode: { type: String, default: '1211' },
    depreciationAccountCode: { type: String, default: '5500' },
    accumulatedDepreciationAccountCode: { type: String, default: '1220' },
    status: {
      type: String,
      enum: ['Active', 'Under Maintenance', 'Temporarily Unavailable', 'Disposed', 'Sold'],
      default: 'Active',
    },
    location: { type: String, default: '' },
    costCenter: { type: String, default: '' },
    custodian: { type: String, default: '' },
    responsibleEmployee: optionalString,
    serialNumber: optionalString,
    notes: optionalString,
    attachments: { type: [String], default: [] },
    isOpeningBalance: { type: Boolean, default: false },
    journalEntryId: optionalString,
    lastDepreciationDate: optionalString,
    disposalDetails: { type: disposalSchema, default: undefined },
  },
  finOptions(),
);

export type AssetCategoryDoc = Doc<AssetCategoryItem>;

export const assetCategorySchema = new Schema<AssetCategoryDoc>(
  {
    _id: idField('cat'),
    code: { type: String, required: true, unique: true },
    nameEn: { type: String, required: true },
    nameAr: { type: String, required: true },
    defaultUsefulLifeMonths: { type: Number, default: 36 },
    defaultDepreciationMethod: { type: String, enum: ['Straight Line', 'Declining Balance'], default: 'Straight Line' },
    assetAccountCode: { type: String, default: '1211' },
    accumulatedDepAccountCode: { type: String, default: '1220' },
    accDepreciationAccountCode: optionalString,
    depreciationExpenseAccountCode: { type: String, default: '5500' },
    depreciationAccountCode: optionalString,
    active: { type: Boolean, default: true },
  },
  finOptions(),
);

const depreciationItemSchema = new Schema(
  {
    assetId: { type: String, required: true },
    assetCode: optionalString,
    assetName: { type: String, default: '' },
    nameAr: optionalString,
    nameEn: optionalString,
    category: { type: String, default: '' },
    acquisitionCost: { type: Number, default: 0 },
    previousAccumulatedDep: { type: Number, default: 0 },
    monthlyDepreciation: { type: Number, default: 0 },
    newAccumulatedDep: { type: Number, default: 0 },
    netBookValue: { type: Number, default: 0 },
    currentNetBookValue: { type: Number, default: undefined },
    projectedNetBookValue: { type: Number, default: undefined },
  },
  sub,
);

export type DepreciationRunDoc = Doc<DepreciationRunRecord>;

/** `runNumber` is `DEP-RUN-YYYY-MM`; its unique index blocks a second run of the same month. */
export const depreciationRunSchema = new Schema<DepreciationRunDoc>(
  {
    _id: idField('dep-run'),
    runNumber: { type: String, required: true, unique: true },
    period: { type: String, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    totalAssetsCount: { type: Number, default: 0 },
    assetCount: { type: Number, default: undefined },
    totalDepreciationAmount: { type: Number, default: 0 },
    totalDepreciation: { type: Number, default: undefined },
    status: { type: String, enum: ['Draft', 'Approved', 'Posted', 'posted'], default: 'Posted' },
    journalEntryId: optionalString,
    journalNumber: optionalString,
    items: { type: [depreciationItemSchema], default: [] },
    executedAt: optionalString,
    createdBy: { type: String, required: true },
    executedBy: optionalString,
    postedAt: optionalString,
    postedBy: optionalString,
  },
  finOptions(),
);

const openingLineSchema = new Schema(
  {
    id: { type: String, required: true },
    accountCode: { type: String, required: true },
    accountNameAr: { type: String, default: '' },
    accountNameEn: { type: String, default: '' },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    subledgerType: { type: String, enum: ['Customer', 'Supplier', 'Bank', 'Asset', 'General'], default: undefined },
    subledgerId: optionalString,
    subledgerName: optionalString,
    costCenter: optionalString,
    location: optionalString,
    dueDate: optionalString,
    reference: optionalString,
    notes: optionalString,
    description: optionalString,
  },
  sub,
);

const changeHistorySchema = new Schema(
  {
    timestamp: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: String, default: '' },
  },
  sub,
);

export type OpeningBalanceDoc = Doc<OpeningBalanceBatch>;

export const openingBalanceSchema = new Schema<OpeningBalanceDoc>(
  {
    _id: idField('ob'),
    batchNumber: { type: String, required: true, unique: true },
    fiscalYear: { type: Number, required: true },
    systemStartDate: { type: String, required: true },
    openingJournalDate: { type: String, required: true },
    openingDate: optionalString,
    baseCurrency: { type: String, default: 'EGP' },
    currency: optionalString,
    status: {
      type: String,
      enum: ['Draft', 'Under Review', 'Approved', 'Posted', 'posted', 'draft'],
      default: 'Draft',
    },
    totalDebit: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },
    difference: { type: Number, default: 0 },
    isBalanced: { type: Boolean, default: false },
    lines: { type: [openingLineSchema], default: [] },
    journalEntryId: optionalString,
    journalNumber: optionalString,
    createdBy: { type: String, required: true },
    reviewedBy: optionalString,
    reviewedAt: optionalString,
    approvedBy: optionalString,
    approvedAt: optionalString,
    postedBy: optionalString,
    postedAt: optionalString,
    notes: optionalString,
    supportingDocuments: { type: [String], default: [] },
    changeHistory: { type: [changeHistorySchema], default: [] },
  },
  finOptions(),
);
// One posted opening balance per fiscal year, enforced by the database too.
openingBalanceSchema.index(
  { fiscalYear: 1 },
  { unique: true, partialFilterExpression: { status: 'Posted' }, name: 'one_posted_per_year' },
);
