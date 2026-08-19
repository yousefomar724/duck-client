import mongoose, { Schema, Types } from 'mongoose';
import { softDeletePlugin, schemaOptions } from '../db/plugins';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'CANCELLED'
  | 'SUCCESS'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'REFUND_FAILED'
  | 'COMPLETED'
  | 'PAID';

export interface PaymentEntry {
  amount: number;
  recorded_at: Date;
  note?: string;
}

export interface PricingSnapshot {
  price: number;
  foreigner_price: number;
  guide_price: number;
}

export interface BookingRevisionChange {
  from: unknown;
  to: unknown;
}

export interface BookingRevision {
  at: Date;
  by_user_id: Types.ObjectId;
  by_role: number;
  note?: string;
  amount_before: number;
  amount_after: number;
  changes: Map<string, BookingRevisionChange>;
}

export interface BookingDoc extends mongoose.Document {
  session_id?: string;
  user_id?: Types.ObjectId | null;
  trip_id: Types.ObjectId;
  supplier_id: Types.ObjectId;
  amount: number;
  currency: string;
  full_name: string;
  phone_number: string;
  status: BookingStatus;
  payment_method: 'MANUAL' | 'KASHIER';
  order_ref?: string;
  order_id?: string;
  booking_date: Date;
  quantity: number;
  local_guests: number;
  foreigner_guests: number;
  adults: number;
  kids_1_6: number;
  kids_7_12: number;
  hear_about_us?: string;
  referral_text?: string;
  resource_type?: string;
  wants_guide: boolean;
  played_before?: boolean | null;
  payment_data?: string;
  /** What the customer told us they'd send at checkout (0/unset = full amount). */
  declared_amount: number;
  /** What has actually been confirmed received by the supplier. */
  amount_paid: number;
  payment_entries: PaymentEntry[];
  /** Tour duration (hours/days) used in pricing — persisted so edits can recompute. */
  duration: number;
  pricing_snapshot: PricingSnapshot;
  /** When true, auto-repricing is blocked; admin must use amount_override. */
  pricing_locked: boolean;
  /** Amount owed back to the customer after a downward edit (off-platform refund). */
  refund_owed: number;
  cancelled_at?: Date | null;
  cancelled_by?: Types.ObjectId | null;
  cancel_reason?: string;
  revisions: BookingRevision[];
  deletedAt: Date | null;
}

const BookingSchema = new Schema<BookingDoc>(
  {
    session_id: { type: String, default: '' },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    trip_id: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    supplier_id: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    full_name: { type: String, required: true },
    phone_number: { type: String, required: true },
    status: { type: String, default: 'PENDING' },
    payment_method: { type: String, required: true, default: 'MANUAL' },
    order_ref: { type: String, default: '' },
    order_id: { type: String, default: '' },
    booking_date: { type: Date, required: true },
    quantity: { type: Number, default: 1 },
    local_guests: { type: Number, default: 0 },
    foreigner_guests: { type: Number, default: 0 },
    adults: { type: Number, default: 0 },
    kids_1_6: { type: Number, default: 0 },
    kids_7_12: { type: Number, default: 0 },
    hear_about_us: { type: String, default: '' },
    referral_text: { type: String, default: '' },
    resource_type: { type: String, default: '' },
    wants_guide: { type: Boolean, default: false },
    played_before: { type: Boolean, default: null },
    payment_data: { type: String, default: '', select: false },
    declared_amount: { type: Number, default: 0 },
    amount_paid: { type: Number, default: 0 },
    payment_entries: {
      type: [
        new Schema<PaymentEntry>(
          {
            amount: { type: Number, required: true },
            recorded_at: { type: Date, required: true, default: () => new Date() },
            note: { type: String, default: '' },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    duration: { type: Number, default: 0 },
    pricing_snapshot: {
      type: new Schema<PricingSnapshot>(
        {
          price: { type: Number, required: true, default: 0 },
          foreigner_price: { type: Number, required: true, default: 0 },
          guide_price: { type: Number, required: true, default: 0 },
        },
        { _id: false },
      ),
      default: () => ({ price: 0, foreigner_price: 0, guide_price: 0 }),
    },
    pricing_locked: { type: Boolean, default: false },
    refund_owed: { type: Number, default: 0 },
    cancelled_at: { type: Date, default: null },
    cancelled_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    cancel_reason: { type: String, default: '' },
    revisions: {
      type: [
        new Schema<BookingRevision>(
          {
            at: { type: Date, required: true, default: () => new Date() },
            by_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            by_role: { type: Number, required: true },
            note: { type: String, default: '' },
            amount_before: { type: Number, required: true },
            amount_after: { type: Number, required: true },
            changes: {
              type: Map,
              of: new Schema<BookingRevisionChange>(
                {
                  from: { type: Schema.Types.Mixed },
                  to: { type: Schema.Types.Mixed },
                },
                { _id: false },
              ),
              default: () => new Map(),
            },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  schemaOptions,
);

BookingSchema.plugin(softDeletePlugin);

BookingSchema.set('toJSON', {
  ...schemaOptions.toJSON,
  // See trip.ts for why `doc.populated(path)` is used instead of a
  // `typeof ret.x === 'object'` check (unpopulated ObjectIds are objects too,
  // and collide with the `.id` virtual via BSON's internal `.id` buffer).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(doc: any, ret: Record<string, unknown>) {
    schemaOptions.toJSON.transform(doc, ret);
    delete ret.payment_data;
    if (doc.populated('trip_id') && ret.trip_id) {
      ret.trip = ret.trip_id;
      ret.trip_id = (ret.trip as { id?: string })?.id;
    }
    if (doc.populated('supplier_id') && ret.supplier_id) {
      ret.supplier = ret.supplier_id;
      ret.supplier_id = (ret.supplier as { id?: string })?.id;
    }
    if (doc.populated('user_id') && ret.user_id) {
      ret.user = ret.user_id;
      ret.user_id = (ret.user as { id?: string })?.id;
    }
    return ret;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

export const Booking =
  mongoose.models.Booking || mongoose.model<BookingDoc>('Booking', BookingSchema, 'bookings');
