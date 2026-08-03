import mongoose, { Schema, Types } from 'mongoose';
import { softDeletePlugin, schemaOptions } from '../db/plugins';

export interface PayoutDoc extends mongoose.Document {
  supplier_id: Types.ObjectId;
  amount: number;
  currency: string;
  status: string;
  deletedAt: Date | null;
}

const PayoutSchema = new Schema<PayoutDoc>(
  {
    supplier_id: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'EGP' },
    status: { type: String, default: 'pending' },
  },
  schemaOptions,
);

PayoutSchema.plugin(softDeletePlugin);

PayoutSchema.set('toJSON', {
  ...schemaOptions.toJSON,
  // See trip.ts for why `doc.populated(path)` is used instead of a
  // `typeof ret.x === 'object'` check.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(doc: any, ret: Record<string, unknown>) {
    schemaOptions.toJSON.transform(doc, ret);
    if (doc.populated('supplier_id') && ret.supplier_id) {
      ret.supplier = ret.supplier_id;
      ret.supplier_id = (ret.supplier as { id?: string })?.id;
    }
    return ret;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

export const Payout =
  mongoose.models.Payout || mongoose.model<PayoutDoc>('Payout', PayoutSchema, 'payouts');
