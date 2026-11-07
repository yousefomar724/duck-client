import { Schema, optionalString, sub } from './common';

/**
 * Duck → ERP sync bookkeeping. Neither collection is an ERP document: they
 * record which ERP documents a Duck booking produced (so a replay posts
 * nothing twice) and which Duck writes still need syncing.
 */

export interface DuckLinkInvoice {
  invoiceId: string;
  invoiceNumber: string;
  journalId: string;
  date: string;
  total: number;
  /** Date + lines the invoice was issued with; a change re-issues it. */
  signature: string;
  state: 'active' | 'reversed';
  reversalJournalId?: string;
}

export interface DuckLinkReceipt {
  /** `pe:<recorded_at ms>:<amount>:<n>` for a payment entry, `adj:<n>` for unrecorded money. */
  key: string;
  receiptId: string;
  receiptNumber: string;
  amount: number;
  date: string;
}

export interface DuckLinkRefund {
  key: string;
  journalId: string;
  journalNumber: string;
  amount: number;
  date: string;
}

export interface DuckLinkDoc {
  /** The Duck booking id. */
  _id: string;
  erpBookingId?: string;
  erpBookingNumber?: string;
  customerId?: string;
  tripId?: string;
  invoices: DuckLinkInvoice[];
  receipts: DuckLinkReceipt[];
  refunds: DuckLinkRefund[];
  /** True once the booking was invoiced (or found to be zero-value). */
  sold: boolean;
  zeroValue?: boolean;
  lastStatus?: string;
  version: number;
  syncedAt?: string;
}

const linkInvoiceSchema = new Schema<DuckLinkInvoice>(
  {
    invoiceId: { type: String, required: true },
    invoiceNumber: { type: String, required: true },
    journalId: { type: String, required: true },
    date: { type: String, required: true },
    total: { type: Number, required: true },
    signature: { type: String, required: true },
    state: { type: String, enum: ['active', 'reversed'], required: true },
    reversalJournalId: optionalString,
  },
  sub,
);

const linkReceiptSchema = new Schema<DuckLinkReceipt>(
  {
    key: { type: String, required: true },
    receiptId: { type: String, required: true },
    receiptNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
  },
  sub,
);

const linkRefundSchema = new Schema<DuckLinkRefund>(
  {
    key: { type: String, required: true },
    journalId: { type: String, required: true },
    journalNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
  },
  sub,
);

export const duckLinkSchema = new Schema<DuckLinkDoc>(
  {
    _id: { type: String, required: true },
    erpBookingId: optionalString,
    erpBookingNumber: optionalString,
    customerId: { type: String, default: undefined, index: true },
    tripId: optionalString,
    invoices: { type: [linkInvoiceSchema], default: [] },
    receipts: { type: [linkReceiptSchema], default: [] },
    refunds: { type: [linkRefundSchema], default: [] },
    sold: { type: Boolean, default: false },
    zeroValue: { type: Boolean, default: undefined },
    lastStatus: optionalString,
    version: { type: Number, default: 0 },
    syncedAt: optionalString,
  },
  { timestamps: true, versionKey: false, minimize: false },
);

export type SyncKind = 'booking' | 'trip';

export interface SyncOutboxDoc {
  /** `booking:<duck id>` or `trip:<duck id>`. */
  _id: string;
  kind: SyncKind;
  refId: string;
  status: 'pending' | 'done' | 'failed';
  /** Bumped by every enqueue; a run only marks the row done if it saw the latest one. */
  seq: number;
  attempts: number;
  lastError: string;
  reason: string;
  enqueuedAt: Date;
  nextAttemptAt: Date;
  lockedUntil: Date | null;
  processedAt?: Date | null;
}

export const syncOutboxSchema = new Schema<SyncOutboxDoc>(
  {
    _id: { type: String, required: true },
    kind: { type: String, enum: ['booking', 'trip'], required: true },
    refId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'done', 'failed'], default: 'pending' },
    seq: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: '' },
    reason: { type: String, default: '' },
    enqueuedAt: { type: Date, default: () => new Date() },
    nextAttemptAt: { type: Date, default: () => new Date() },
    lockedUntil: { type: Date, default: null },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

syncOutboxSchema.index({ status: 1, nextAttemptAt: 1 });
