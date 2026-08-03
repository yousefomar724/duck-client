import mongoose, { Schema, Types } from 'mongoose';
import { softDeletePlugin, schemaOptions } from '../db/plugins';

export interface UserDoc extends mongoose.Document {
  wallet_id?: Types.ObjectId | null;
  username: string;
  email: string;
  password?: string | null;
  role: 0 | 1 | 2;
  first_name: string;
  last_name: string;
  phone_number?: string | null;
  supplier_id?: Types.ObjectId | null;
  google_id?: string | null;
  active: boolean;
  deletedAt: Date | null;
}

const UserSchema = new Schema<UserDoc>(
  {
    // No `default: null` on these three: a sparse unique index only skips
    // documents where the field is *absent*. Mongoose applying a `null`
    // default makes the field present-but-null on every document, which a
    // sparse index does NOT skip — so the second user ever created (with no
    // wallet/supplier/google linkage) collides with the first on `null`.
    wallet_id: { type: Schema.Types.ObjectId, ref: 'Wallet', unique: true, sparse: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null, select: false },
    role: { type: Number, enum: [0, 1, 2], default: 0 },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    phone_number: { type: String, default: null },
    supplier_id: { type: Schema.Types.ObjectId, ref: 'Supplier', unique: true, sparse: true },
    google_id: { type: String, unique: true, sparse: true },
    active: { type: Boolean, default: true },
  },
  schemaOptions,
);

UserSchema.plugin(softDeletePlugin);

UserSchema.set('toJSON', {
  ...schemaOptions.toJSON,
  transform(doc: unknown, ret: Record<string, unknown>) {
    schemaOptions.toJSON.transform(doc, ret);
    delete ret.password;
    return ret;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

export const User = mongoose.models.User || mongoose.model<UserDoc>('User', UserSchema, 'users');
