import mongoose, { Schema, Types } from 'mongoose';
import { softDeletePlugin, schemaOptions } from '../db/plugins';

export interface WalletDoc extends mongoose.Document {
  user_id: Types.ObjectId;
  amount: number;
  supplier_id: Types.ObjectId;
  deletedAt: Date | null;
}

const WalletSchema = new Schema<WalletDoc>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    amount: { type: Number, required: true, default: 0 },
    supplier_id: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  },
  schemaOptions,
);

WalletSchema.plugin(softDeletePlugin);

export const Wallet =
  mongoose.models.Wallet || mongoose.model<WalletDoc>('Wallet', WalletSchema, 'wallets');
