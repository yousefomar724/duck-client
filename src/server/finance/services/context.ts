import type { ClientSession } from 'mongoose';
import type { UserRole } from '@/lib/finance/erp-types';
import { getFinanceModels, type FinanceModels } from '../models';

/** HTTP-mappable failure: the route layer turns it into `{error}` with `status`. */
export class FinanceError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 500,
    message: string,
  ) {
    super(message);
    this.name = 'FinanceError';
  }
}

/**
 * Thrown inside a transaction when a posting needs a period that does not
 * exist yet. `inTransaction` creates it outside the transaction (so two
 * concurrent first postings of a month cannot collide on its insert) and
 * runs the callback again.
 */
export class MissingRecordError extends Error {
  constructor(public readonly create: () => Promise<void>) {
    super('missing record');
    this.name = 'MissingRecordError';
  }
}

export const badRequest = (message: string) => new FinanceError(400, message);
export const notFound = (message: string) => new FinanceError(404, message);

/** The authenticated finance user a service call acts as (audit trail, createdBy…). */
export interface FinanceActor {
  id: string;
  name: string;
  role: UserRole;
  permissions: string[];
}

export interface FinCtx {
  m: FinanceModels;
  /** Set inside a transaction; every read and write in the call must carry it. */
  session: ClientSession | null;
  actor: FinanceActor;
}

/** Mongoose options carrying the context's session. */
export function so(ctx: FinCtx): { session?: ClientSession } {
  return ctx.session ? { session: ctx.session } : {};
}

export function readCtx(actor: FinanceActor, m: FinanceModels = getFinanceModels()): FinCtx {
  return { m, session: null, actor };
}

function isStandaloneError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : '';
  return /Transaction numbers are only allowed on a replica set|replica set/i.test(message) && /transaction/i.test(message);
}

/**
 * Runs `fn` in one MongoDB transaction: every document an action writes
 * (invoice + journal + customer + counter + audit entry…) commits together
 * or not at all. The callback may be retried on transient conflicts, so it
 * must do all its work through `ctx`.
 */
export async function inTransaction<T>(
  actor: FinanceActor,
  fn: (ctx: FinCtx) => Promise<T>,
  m: FinanceModels = getFinanceModels(),
): Promise<T> {
  const conn = m.Account.db;
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        return await conn.transaction(async (session) => fn({ m, session, actor }));
      } catch (err) {
        if (!(err instanceof MissingRecordError) || attempt >= 3) throw err;
        await err.create();
      }
    }
  } catch (err) {
    if (isStandaloneError(err)) {
      throw new FinanceError(500, 'The finance module needs a MongoDB replica set (transactions are not available).');
    }
    if (isDuplicateKeyError(err)) {
      throw new FinanceError(400, duplicateKeyMessage(err));
    }
    throw err;
  }
}

export function isDuplicateKeyError(err: unknown): err is { code: number; keyValue?: Record<string, unknown> } {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

function duplicateKeyMessage(err: { keyValue?: Record<string, unknown> }): string {
  const entry = Object.entries(err.keyValue ?? {})[0];
  return entry ? `${entry[0]} ${String(entry[1])} already exists.` : 'Duplicate record.';
}
