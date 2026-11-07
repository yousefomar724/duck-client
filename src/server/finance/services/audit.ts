import type { AuditLog } from '@/lib/finance/erp-types';
import { so, type FinCtx } from './context';
import { nowIso, toOutList } from './util';

/** Appends to the audit trail inside the caller's transaction. Never trimmed. */
export async function logAudit(ctx: FinCtx, action: string, entity: string, entityId: string, details: string) {
  await ctx.m.AuditLog.create(
    [
      {
        timestamp: nowIso(),
        userId: ctx.actor.id,
        userName: ctx.actor.name,
        action,
        entity,
        entityId,
        details,
      },
    ],
    so(ctx),
  );
}

/** Newest first. `before` (an ISO timestamp) pages back through older entries. */
export async function getAuditLogs(ctx: FinCtx, opts: { limit?: number; before?: string } = {}): Promise<AuditLog[]> {
  const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 500), 1), 5000);
  const filter = opts.before ? { timestamp: { $lt: opts.before } } : {};
  const rows = await ctx.m.AuditLog.find(filter).sort({ timestamp: -1, _id: -1 }).limit(limit).lean().session(ctx.session);
  return toOutList<AuditLog>(rows);
}
