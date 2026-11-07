import { financeRead } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getGeneralLedger } from '@/server/finance/services/ledger';

export const GET = financeRead({ permission: P.reportsRead }, (ctx, { query }) =>
  getGeneralLedger(
    ctx,
    query.get('accountCode') || undefined,
    query.get('startDate') || undefined,
    query.get('endDate') || undefined,
    query.get('costCenter') || undefined,
  ),
);
