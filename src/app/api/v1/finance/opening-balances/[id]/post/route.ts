import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { postOpeningBalanceBatch } from '@/server/finance/services/opening-balances';

export const POST = financeWrite<{ id: string }>({ permission: P.openingBalancesPost }, (ctx, { params }) =>
  postOpeningBalanceBatch(ctx, params.id),
);
