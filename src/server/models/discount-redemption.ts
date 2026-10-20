import mongoose, { Schema, Types } from 'mongoose';
import { schemaOptions } from '../db/plugins';

export type DiscountRedemptionStatus = 'active' | 'released';

export interface DiscountRedemptionDoc extends mongoose.Document {
  code_id: Types.ObjectId;
  booking_id: Types.ObjectId;
  supplier_id: Types.ObjectId;
  customer_key: string;
  user_id: Types.ObjectId | null;
  discount_amount: number;
  once_per_customer: boolean;
  status: DiscountRedemptionStatus;
  released_at: Date | null;
  released_reason: string;
}

const DiscountRedemptionSchema = new Schema<DiscountRedemptionDoc>(
  {
    code_id: { type: Schema.Types.ObjectId, ref: 'DiscountCode', required: true },
    booking_id: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    supplier_id: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    customer_key: { type: String, required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    discount_amount: { type: Number, required: true },
    once_per_customer: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'released'], default: 'active' },
    released_at: { type: Date, default: null },
    released_reason: { type: String, default: '' },
  },
  schemaOptions,
);

// The flag is copied onto the redemption so two racing checkouts cannot both
// claim a once-per-customer code. Released rows drop out of the partial index,
// which is what gives the use back.
DiscountRedemptionSchema.index(
  { code_id: 1, customer_key: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active', once_per_customer: true },
  },
);
DiscountRedemptionSchema.index({ booking_id: 1 }, { unique: true });
DiscountRedemptionSchema.index({ code_id: 1, status: 1 });

export const DiscountRedemption =
  mongoose.models.DiscountRedemption ||
  mongoose.model<DiscountRedemptionDoc>(
    'DiscountRedemption',
    DiscountRedemptionSchema,
    'discount_redemptions',
  );
