import mongoose, { Schema, Types } from 'mongoose';
import { softDeletePlugin, schemaOptions } from '../db/plugins';

export const ALLOWED_RESOURCE_TYPES = ['kayak', 'water_cycle', 'sup'] as const;
export type ResourceType = (typeof ALLOWED_RESOURCE_TYPES)[number];

export interface SupplierStorageDoc extends mongoose.Document {
  supplier_id: Types.ObjectId;
  resources: Map<string, number>;
  deletedAt: Date | null;
}

const SupplierStorageSchema = new Schema<SupplierStorageDoc>(
  {
    supplier_id: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, unique: true },
    resources: { type: Map, of: Number, required: true, default: () => new Map() },
  },
  schemaOptions,
);

SupplierStorageSchema.plugin(softDeletePlugin);

export const SupplierStorage =
  mongoose.models.SupplierStorage ||
  mongoose.model<SupplierStorageDoc>('SupplierStorage', SupplierStorageSchema, 'supplier_storages');
