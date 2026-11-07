import { financeRead } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getTrialBalance } from '@/server/finance/services/ledger';

export const GET = financeRead({ permission: P.reportsRead }, (ctx, { query }) =>
  getTrialBalance(ctx, query.get('startDate') || undefined, query.get('endDate') || undefined),
);
