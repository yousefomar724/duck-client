import type {
  ActivityTypeItem,
  BookingItem,
  CaptainItem,
  ChannelItem,
  CustomRoleItem,
  ExpenseCategoryMapping,
  InternalControlSettings,
  LocationItem,
  OfficialTripItem,
  PaymentMethodItem,
  ServiceItem,
  TourTypeItem,
} from '@/lib/finance/erp-types';
import { Schema, finOptions, idField, optionalString, sub, type Doc } from './common';

/** Lists the ERP kept as ordered arrays carry `sortOrder` to keep that order. */
type Ordered<T> = Doc<T> & { sortOrder: number };

const sortOrder = { type: Number, default: 0, index: true };

export type ExpenseMappingDoc = Ordered<ExpenseCategoryMapping>;

export const expenseMappingSchema = new Schema<ExpenseMappingDoc>(
  {
    _id: idField('cat'),
    categoryNameAr: { type: String, required: true },
    categoryNameEn: { type: String, required: true },
    defaultAccountCode: { type: String, required: true },
    accountType: {
      type: String,
      enum: ['Operating Expense', 'Cost of Revenue', 'Asset Capitalization', 'Equity Distribution', 'Commission Payable'],
      required: true,
    },
    notes: optionalString,
    sortOrder,
  },
  finOptions(),
);

export type PaymentMethodDoc = Ordered<PaymentMethodItem>;

export const paymentMethodSchema = new Schema<PaymentMethodDoc>(
  {
    _id: idField('pm'),
    nameAr: { type: String, required: true },
    nameEn: { type: String, required: true },
    accountCode: { type: String, required: true },
    sortOrder,
  },
  finOptions(),
);

export type ChannelDoc = Ordered<ChannelItem>;

export const channelSchema = new Schema<ChannelDoc>(
  {
    _id: idField('chn'),
    nameAr: { type: String, required: true },
    nameEn: { type: String, required: true },
    sortOrder,
  },
  finOptions(),
);

export type LocationDoc = Ordered<LocationItem>;

export const locationSchema = new Schema<LocationDoc>(
  {
    _id: idField('loc'),
    nameAr: { type: String, required: true },
    nameEn: { type: String, required: true },
    sortOrder,
  },
  finOptions(),
);

export type TourTypeDoc = Ordered<TourTypeItem>;

export const tourTypeSchema = new Schema<TourTypeDoc>(
  {
    _id: idField('tt'),
    nameEn: { type: String, default: '' },
    nameAr: { type: String, default: '' },
    duration: { type: String, default: '' },
    active: { type: Boolean, default: undefined },
    sortOrder,
  },
  finOptions(),
);

export type CaptainDoc = Ordered<CaptainItem>;

export const captainSchema = new Schema<CaptainDoc>(
  {
    _id: idField('cpt'),
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    commissionRate: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    notes: optionalString,
    sortOrder,
  },
  finOptions(),
);

export type ServiceDoc = Ordered<ServiceItem>;

export const serviceSchema = new Schema<ServiceDoc>(
  {
    _id: idField('srv'),
    nameEn: { type: String, default: '' },
    nameAr: { type: String, default: '' },
    defaultPrice: { type: Number, default: 0 },
    revenueAccountCode: { type: String, default: '4150' },
    active: { type: Boolean, default: undefined },
    sortOrder,
  },
  finOptions(),
);

export type ActivityTypeDoc = Ordered<ActivityTypeItem>;

export const activityTypeSchema = new Schema<ActivityTypeDoc>(
  {
    _id: idField('act'),
    name: { type: String, required: true },
    nameAr: { type: String, default: '' },
    description: optionalString,
    active: { type: Boolean, default: true },
    sortOrder,
  },
  finOptions(),
);

export type CustomRoleDoc = Ordered<CustomRoleItem>;

export const customRoleSchema = new Schema<CustomRoleDoc>(
  {
    _id: idField('role'),
    name: { type: String, required: true },
    nameAr: { type: String, default: '' },
    description: { type: String, default: '' },
    permissions: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },
    sortOrder,
  },
  finOptions(),
);

export type InternalControlsDoc = InternalControlSettings & { _id: string };

/** Singleton (`_id: 'internal-controls'`). */
export const internalControlsSchema = new Schema<InternalControlsDoc>(
  {
    _id: { type: String, default: 'internal-controls' },
    maxApprovalLimit: { type: Number, default: 5000 },
    requireTwoStepApproval: { type: Boolean, default: true },
    enforceSegregationOfDuties: { type: Boolean, default: true },
    blockLockedPeriodPostings: { type: Boolean, default: true },
    forbidDirectPostedEdits: { type: Boolean, default: true },
    autoDepreciationOnClose: { type: Boolean, default: true },
    baseCurrency: { type: String, default: 'EGP' },
  },
  finOptions(),
);

const priceAuditSchema = new Schema(
  {
    id: { type: String, required: true },
    date: { type: String, required: true },
    changedBy: { type: String, required: true },
    oldEgyptianPrice: { type: Number, default: 0 },
    newEgyptianPrice: { type: Number, default: 0 },
    oldForeignerPrice: { type: Number, default: null },
    newForeignerPrice: { type: Number, default: null },
    reason: { type: String, default: '' },
  },
  sub,
);

const scheduledPriceSchema = new Schema(
  {
    id: { type: String, required: true },
    effectiveDate: { type: String, required: true },
    egyptianPrice: { type: Number, default: 0 },
    foreignerPrice: { type: Number, default: null },
    status: { type: String, enum: ['Pending', 'Applied', 'Cancelled'], default: 'Pending' },
    createdAt: { type: String, required: true },
    createdBy: { type: String, required: true },
  },
  sub,
);

export type TripDoc = Doc<OfficialTripItem>;

export const tripSchema = new Schema<TripDoc>(
  {
    _id: idField('trip'),
    tripCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String, default: '' },
    destination: { type: String, default: '' },
    operationalLocation: { type: String, default: '' },
    activityType: { type: String, default: '' },
    description: { type: String, default: '' },
    descriptionAr: { type: String, default: '' },
    egyptianPrice: { type: Number, default: 0 },
    foreignerPrice: { type: Number, default: null },
    isForeignerPricePending: { type: Boolean, default: false },
    pricingUnit: { type: String, enum: ['Per Person', 'Per Hour', 'Per Equipment', 'Per Group'], default: 'Per Person' },
    currency: { type: String, default: 'EGP' },
    duration: { type: String, default: '' },
    captainIncluded: { type: Boolean, default: true },
    equipmentRequired: { type: [String], default: [] },
    maxParticipants: { type: Number, default: 12 },
    minParticipants: { type: Number, default: 1 },
    bookingAvailability: {
      type: String,
      enum: ['Available', 'High Season Only', 'Weekend Only', 'Unavailable'],
      default: 'Available',
    },
    operationalStatus: { type: String, enum: ['Active', 'Seasonal', 'Maintenance', 'Inactive'], default: 'Active' },
    websiteDisplayStatus: { type: String, enum: ['Published', 'Draft', 'Hidden'], default: 'Published' },
    websiteTripId: optionalString,
    /** Mirrored from a Duck Aswan trip: prices and delete are read-only in the ERP. */
    duckSynced: { type: Boolean, default: undefined },
    internalNotes: { type: String, default: '' },
    priceAuditTrail: { type: [priceAuditSchema], default: [] },
    scheduledPriceChanges: { type: [scheduledPriceSchema], default: [] },
  },
  finOptions(),
);

export type BookingDoc = Doc<BookingItem>;

export const bookingSchema = new Schema<BookingDoc>(
  {
    _id: idField('bkg'),
    bookingNumber: { type: String, required: true, unique: true },
    tripId: { type: String, required: true },
    tripName: { type: String, default: '' },
    destination: { type: String, default: '' },
    activityType: { type: String, default: '' },
    bookingDate: { type: String, required: true },
    bookingTime: { type: String, default: '' },
    customerName: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    nationalityCategory: { type: String, enum: ['Egyptian', 'Foreigner', 'Mixed Group'], required: true },
    egyptianPax: { type: Number, default: 0 },
    foreignerPax: { type: Number, default: 0 },
    egyptianUnitPrice: { type: Number, default: 0 },
    foreignerUnitPrice: { type: Number, default: 0 },
    foreignerPricePendingOverride: { type: Boolean, default: undefined },
    subtotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    discountReason: optionalString,
    totalAmount: { type: Number, default: 0 },
    depositPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    status: { type: String, enum: ['Confirmed', 'Completed', 'Cancelled', 'Invoiced'], default: 'Confirmed' },
    invoiceId: optionalString,
    invoiceNumber: optionalString,
    notes: optionalString,
    websiteRef: optionalString,
    /** Mirrored from a Duck Aswan booking (`websiteRef` is its Duck id): read-only in the ERP. */
    duckSynced: { type: Boolean, default: undefined },
  },
  finOptions(),
);
