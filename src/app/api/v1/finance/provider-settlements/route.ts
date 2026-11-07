import { financeRead, financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { createProviderSettlement, getProviderSettlements } from '@/server/finance/services/settlements';

export const GET = financeRead({}, (ctx) => getProviderSettlements(ctx));

export const POST = financeWrite({ permission: P.journalsPost, status: 201 }, (ctx, { body }) =>
  createProviderSettlement(ctx, body),
);
