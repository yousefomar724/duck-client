import { financeRead } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getAuditLogs } from '@/server/finance/services/audit';

export const GET = financeRead({ permission: P.auditRead }, (ctx, { query }) =>
  getAuditLogs(ctx, { limit: Number(query.get('limit')) || undefined, before: query.get('before') || undefined }),
);
