import { genId } from '../models/common';
import { badRequest } from './context';

export { genId };

export const nowIso = () => new Date().toISOString();

/** Today as `YYYY-MM-DD` (UTC, like the ERP's `toISOString().split('T')[0]`). */
export const today = () => nowIso().split('T')[0];

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Validates a `YYYY-MM-DD` date (the ERP's document date format). */
export function ymd(value: unknown, field = 'date'): string {
  if (typeof value !== 'string' || !YMD.test(value)) {
    throw badRequest(`${field} must be a date in YYYY-MM-DD format.`);
  }
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw badRequest(`${field} is not a valid calendar date.`);
  }
  return value;
}

export const yearOf = (date: string) => Number(date.slice(0, 4));

/** Fields a client may never set through a generic "update" body. */
const SYSTEM_FIELDS = ['_id', 'id', '__v', 'createdAt', 'updatedAt'];

/** Copies `updates` minus system fields and any `blocked` keys. */
export function cleanUpdates<T extends object>(updates: unknown, blocked: string[] = []): Partial<T> {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (SYSTEM_FIELDS.includes(key) || blocked.includes(key) || value === undefined) continue;
    out[key] = value;
  }
  return out as Partial<T>;
}

type Jsonable = { toJSON: () => unknown };

/** API shape of a stored record: hydrated docs via toJSON, lean objects mapped by hand. */
export function toOut<T = Record<string, unknown>>(doc: unknown): T {
  if (doc && typeof (doc as Jsonable).toJSON === 'function') return (doc as Jsonable).toJSON() as T;
  const { _id, __v, passwordHash, tokenVersion, sortOrder, ...rest } = doc as Record<string, unknown>;
  void __v;
  void passwordHash;
  void tokenVersion;
  void sortOrder;
  return { ...rest, id: String(_id) } as T;
}

export const toOutList = <T = Record<string, unknown>>(docs: unknown[]): T[] => docs.map((d) => toOut<T>(d));

export function asObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  return body as Record<string, unknown>;
}

export const lineId = (prefix: string, idx: number) => `${prefix}-${genId('l').slice(2, 14)}-${idx}`;
