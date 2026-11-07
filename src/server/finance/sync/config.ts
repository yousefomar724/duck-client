import { Types } from 'mongoose';
import { DUCK_SYNC_ACTOR_ID, type FinanceActor } from '../services/context';

/**
 * The Duck Aswan supplier: the only supplier whose bookings reach the ERP.
 * Unset or malformed means the sync is off (fail closed): nothing is queued
 * or posted.
 */
export function duckSupplierId(): string | null {
  const raw = process.env.FINANCE_DUCK_SUPPLIER_ID?.trim() ?? '';
  return Types.ObjectId.isValid(raw) && /^[0-9a-f]{24}$/i.test(raw) ? raw.toLowerCase() : null;
}

export function isDuckSupplier(supplierId: unknown): boolean {
  const id = duckSupplierId();
  return id !== null && supplierId != null && String(supplierId).toLowerCase() === id;
}

/** Cash/bank account MANUAL payments settle into. Default 1111 (Main Cash on Hand). */
export function manualPaymentAccount(): string {
  const raw = process.env.FINANCE_DUCK_MANUAL_ACCOUNT?.trim();
  return raw && /^\d{3,6}$/.test(raw) ? raw : '1111';
}

/** Payment Gateway Clearing: Kashier card payments land here until settled to the bank. */
export const KASHIER_ACCOUNT = '1115';

/** Optional floor (`YYYY-MM-DD`, activity date): older bookings stay out unless already linked. */
export function envGoLive(): string | null {
  const raw = process.env.FINANCE_SYNC_FROM?.trim() ?? '';
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

/** Inline processing after a Duck write; the cron always runs. Off with FINANCE_SYNC_INLINE=0. */
export function inlineSyncEnabled(): boolean {
  return process.env.FINANCE_SYNC_INLINE !== '0';
}

export const SYNC_ACTOR: FinanceActor = {
  id: DUCK_SYNC_ACTOR_ID,
  name: 'Duck Sync',
  role: 'Super Admin',
  permissions: ['*'],
};
