import mongoose, { Schema, Types } from 'mongoose';
import { softDeletePlugin, schemaOptions } from '../db/plugins';

export type DiscountCodeType = 'percentage' | 'fixed';
export type DiscountFundedBy = 'supplier' | 'platform';
export type DiscountCodeStatus = 'active' | 'disabled';

export interface DiscountCodeDoc extends mongoose.Document {
  code: string;
  description: string;
  type: DiscountCodeType;
  value: number;
  currency: string;
  max_discount: number | null;
  min_booking_amount: number | null;
  starts_at: Date | null;
  expires_at: Date;
  usage_limit_total: number | null;
  once_per_customer: boolean;
  used_count: number;
  supplier_id: Types.ObjectId | null;
  trip_ids: Types.ObjectId[];
  funded_by: DiscountFundedBy;
  created_by_user_id: Types.ObjectId;
  created_by_role: number;
  status: DiscountCodeStatus;
  deletedAt: Date | null;
}

const DiscountCodeSchema = new Schema<DiscountCodeDoc>(
  {
    code: { type: String, required: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true },
    currency: { type: String, default: '' },
    max_discount: { type: Number, default: null },
    min_booking_amount: { type: Number, default: null },
    starts_at: { type: Date, default: null },
    expires_at: { type: Date, required: true },
    usage_limit_total: { type: Number, default: null },
    once_per_customer: { type: Boolean, default: false },
    used_count: { type: Number, default: 0 },
    supplier_id: { type: Schema.Types.ObjectId, ref: 'Supplier', default: null },
    trip_ids: { type: [Schema.Types.ObjectId], ref: 'Trip', default: [] },
    funded_by: { type: String, enum: ['supplier', 'platform'], required: true },
    created_by_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    created_by_role: { type: Number, required: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  },
  schemaOptions,
);

DiscountCodeSchema.plugin(softDeletePlugin);

DiscountCodeSchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
DiscountCodeSchema.index({ supplier_id: 1, status: 1 });
DiscountCodeSchema.index({ expires_at: 1 });

export const DiscountCode =
  mongoose.models.DiscountCode ||
  mongoose.model<DiscountCodeDoc>('DiscountCode', DiscountCodeSchema, 'discount_codes');
