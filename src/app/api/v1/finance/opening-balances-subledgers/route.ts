import { financeRead } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getSubledgerSummaries } from '@/server/finance/services/opening-balances';

export const GET = financeRead({ permission: P.reportsRead }, (ctx) => getSubledgerSummaries(ctx));
