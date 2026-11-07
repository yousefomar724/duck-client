import { financeRead } from '@/server/finance/http';
import { getDashboardSummary } from '@/server/finance/services/profit';

export const GET = financeRead({}, (ctx, { query }) =>
  getDashboardSummary(ctx, query.get('startDate') || undefined, query.get('endDate') || undefined),
);
