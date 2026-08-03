import mongoose, { Schema, Types } from 'mongoose';
import { softDeletePlugin, schemaOptions } from '../db/plugins';

export interface LocalizedText {
  en: string;
  ar: string;
}

export interface SupplierDoc extends mongoose.Document {
  user_id: Types.ObjectId;
  email: string;
  name: LocalizedText;
  about: LocalizedText;
  icon: string;
  rate: number;
  deletedAt: Date | null;
}

const LocalizedSchema = new Schema<LocalizedText>(
  {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
  },
  { _id: false },
);

const SupplierSchema = new Schema<SupplierDoc>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: LocalizedSchema, default: () => ({ en: '', ar: '' }) },
    about: { type: LocalizedSchema, default: () => ({ en: '', ar: '' }) },
    icon: { type: String, default: '' },
    rate: { type: Number, default: 0 },
  },
  schemaOptions,
);

SupplierSchema.plugin(softDeletePlugin);

export const Supplier =
  mongoose.models.Supplier || mongoose.model<SupplierDoc>('Supplier', SupplierSchema, 'suppliers');
