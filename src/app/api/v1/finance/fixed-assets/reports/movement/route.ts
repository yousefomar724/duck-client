import { financeRead } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getAssetMovementReport } from '@/server/finance/services/assets';

export const GET = financeRead({ permission: P.reportsRead }, (ctx, { query }) =>
  getAssetMovementReport(ctx, query.get('startDate') || undefined, query.get('endDate') || undefined),
);
