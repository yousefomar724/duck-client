import { Schema, Types } from 'mongoose';

/**
 * Finance documents keep the ERP's string ids (`inv-…`, `pm-1`, `p-2026-11`)
 * as `_id`, so seeded reference rows keep the ids the ERP screens already
 * reference, and every record exposes `id` as a string.
 */
export function genId(prefix: string): string {
  return `${prefix}-${new Types.ObjectId().toHexString()}`;
}

function transform(_doc: unknown, ret: Record<string, unknown>) {
  ret.id = String(ret._id);
  delete ret._id;
  delete ret.__v;
  delete ret.passwordHash;
  delete ret.tokenVersion;
  delete ret.sortOrder;
  return ret;
}

export const finToJSON = {
  versionKey: false,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared across every model's `ret` type
  transform: transform as any,
};

/** Stored shape of an ERP record: its string `id` lives in `_id`. */
export type Doc<T> = Omit<T, 'id'> & { _id: string; createdAt?: unknown; updatedAt?: unknown };

export function finOptions() {
  return {
    timestamps: true,
    toJSON: finToJSON,
    minimize: false,
  } as const;
}

/** A string `_id` with a generated default carrying the ERP-style prefix. */
export function idField(prefix: string) {
  return { type: String, default: () => genId(prefix) };
}

/** Embedded arrays (invoice lines, journal lines…) carry their own `id`, never `_id`. */
export const sub = { _id: false } as const;

export const optionalString = { type: String, default: undefined };

export { Schema };
