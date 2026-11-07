import { financeRead, financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getOpeningBalances, createOpeningBalanceBatch } from '@/server/finance/services/opening-balances';

export const GET = financeRead({}, (ctx) => getOpeningBalances(ctx));

export const POST = financeWrite({ permission: P.openingBalancesManage, status: 201 }, (ctx, { body }) =>
  createOpeningBalanceBatch(ctx, body),
);
