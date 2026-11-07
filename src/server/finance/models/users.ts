import type { User, UserRole } from '@/lib/finance/erp-types';
import { USER_ROLES } from '@/lib/finance/erp-types';
import { Schema, finOptions, idField, optionalString, type Doc } from './common';

export type FinUserDoc = Doc<Omit<User, 'permissions'>> & {
  role: UserRole;
  passwordHash: string;
  /** Bumped on password reset / deactivation so older tokens stop working. */
  tokenVersion: number;
};

/**
 * Finance staff accounts — `fin_users`, deliberately separate from Duck's
 * `users`. Created by a Super Admin; there is no self-signup.
 */
export const finUserSchema = new Schema<FinUserDoc>(
  {
    _id: idField('u'),
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true },
    email: { type: String, default: '' },
    role: { type: String, required: true, enum: USER_ROLES as UserRole[] },
    customRoleId: optionalString,
    active: { type: Boolean, default: true },
    avatar: optionalString,
    passwordHash: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0, select: false },
  },
  finOptions(),
);
