import { financeRead } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getFinancialStatements } from '@/server/finance/services/ledger';

export const GET = financeRead({ permission: P.reportsRead }, (ctx) => getFinancialStatements(ctx));
