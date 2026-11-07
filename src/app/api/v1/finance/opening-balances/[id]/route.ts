import { financeRead, financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getOpeningBalanceById, updateOpeningBalanceBatch } from '@/server/finance/services/opening-balances';

export const GET = financeRead<{ id: string }>({}, (ctx, { params }) => getOpeningBalanceById(ctx, params.id));

export const PUT = financeWrite<{ id: string }>({ permission: P.openingBalancesManage }, (ctx, { params, body }) =>
  updateOpeningBalanceBatch(ctx, params.id, body),
);
