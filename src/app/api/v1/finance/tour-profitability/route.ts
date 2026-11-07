import { financeRead } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getTourProfitability } from '@/server/finance/services/reports';

export const GET = financeRead({ permission: P.reportsRead }, (ctx, { query }) =>
  getTourProfitability(ctx, query.get('startDate') || undefined, query.get('endDate') || undefined),
);
