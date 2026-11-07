import type {
  Account,
  AccountingPeriod,
  AuditLog,
  CostCenter,
  JournalEntry,
} from '@/lib/finance/erp-types';
import { Schema, finOptions, idField, optionalString, sub, type Doc } from './common';

/** `balance` is never stored: it is derived from posted journal lines on read. */
export type AccountDoc = Omit<Account, 'balance'> & { _id: string };

export const accountSchema = new Schema<AccountDoc>(
  {
    _id: idField('acc'),
    code: { type: String, required: true, unique: true, trim: true },
    nameAr: { type: String, required: true },
    nameEn: { type: String, required: true },
    type: { type: String, required: true, enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] },
    parentCode: optionalString,
    normalBalance: { type: String, required: true, enum: ['Debit', 'Credit'] },
    isPosting: { type: Boolean, default: true },
    currency: { type: String, default: 'EGP' },
    active: { type: Boolean, default: true },
    description: optionalString,
  },
  finOptions(),
);

const journalLineSchema = new Schema(
  {
    id: { type: String, required: true },
    accountCode: { type: String, required: true },
    accountNameAr: { type: String, default: '' },
    accountNameEn: { type: String, default: '' },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    description: optionalString,
    costCenter: optionalString,
    activity: optionalString,
    location: optionalString,
  },
  sub,
);

export type JournalEntryDoc = Doc<JournalEntry>;

export const journalEntrySchema = new Schema<JournalEntryDoc>(
  {
    _id: idField('je'),
    journalNumber: { type: String, required: true, unique: true },
    date: { type: String, required: true, index: true },
    periodId: { type: String, required: true, index: true },
    sourceDocument: { type: String, required: true },
    sourceDocumentNumber: { type: String, required: true },
    sourceId: optionalString,
    description: { type: String, default: '' },
    lines: { type: [journalLineSchema], default: [] },
    totalDebit: { type: Number, required: true },
    totalCredit: { type: Number, required: true },
    costCenter: optionalString,
    activity: optionalString,
    location: optionalString,
    createdBy: { type: String, required: true },
    approvedBy: optionalString,
    postedBy: optionalString,
    postedAt: optionalString,
    status: { type: String, required: true, enum: ['draft', 'posted', 'reversed'], index: true },
    reversalOfId: optionalString,
    isReversal: { type: Boolean, default: undefined },
  },
  finOptions(),
);
journalEntrySchema.index({ 'lines.accountCode': 1 });

export type PeriodDoc = Doc<AccountingPeriod> & { lastPostedAt?: string };

/** `_id` is `p-YYYY-MM`, so the period of any document date is a direct lookup. */
export const periodSchema = new Schema<PeriodDoc>(
  {
    _id: { type: String, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    name: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    status: { type: String, required: true, enum: ['Open', 'Closed', 'Locked'], default: 'Open' },
    closedAt: optionalString,
    closedBy: optionalString,
    /** Touched by every posting so a concurrent lock and post conflict instead of racing. */
    lastPostedAt: optionalString,
  },
  finOptions(),
);

export type CostCenterDoc = CostCenter & { _id: string };

export const costCenterSchema = new Schema<CostCenterDoc>(
  {
    _id: idField('cc'),
    code: { type: String, required: true, unique: true },
    nameAr: { type: String, required: true },
    nameEn: { type: String, required: true },
    type: { type: String, required: true, enum: ['Location', 'Activity', 'Department', 'Channel'] },
    active: { type: Boolean, default: true },
  },
  finOptions(),
);

export type AuditLogDoc = Doc<AuditLog>;

/** Unbounded: the ERP capped this at 500 entries and silently dropped history. */
export const auditLogSchema = new Schema<AuditLogDoc>(
  {
    _id: idField('log'),
    timestamp: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, required: true },
    details: { type: String, default: '' },
  },
  finOptions(),
);

export interface CounterDoc {
  _id: string;
  seq: number;
}

/** One document per number series (`INV-2026`, `JV-2026`…), bumped atomically. */
export const counterSchema = new Schema<CounterDoc>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export interface MetaDoc {
  _id: string;
  version: number;
  appliedAt: string;
}

/** Bookkeeping for one-time jobs (the reference-data seed). */
export const metaSchema = new Schema<MetaDoc>(
  {
    _id: { type: String, required: true },
    version: { type: Number, required: true },
    appliedAt: { type: String, required: true },
  },
  { versionKey: false },
);
