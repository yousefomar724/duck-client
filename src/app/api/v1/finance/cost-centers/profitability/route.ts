import { financeRead } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getCostCenterProfitability } from '@/server/finance/services/profit';

export const GET = financeRead({ permission: P.reportsRead }, (ctx, { query }) =>
  getCostCenterProfitability(ctx, query.get('startDate') || undefined, query.get('endDate') || undefined),
);
