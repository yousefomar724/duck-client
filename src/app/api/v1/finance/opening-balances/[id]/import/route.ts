import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { importOpeningBalancesFromRows } from '@/server/finance/services/opening-balances';

export const POST = financeWrite<{ id: string }>({ permission: P.openingBalancesManage }, (ctx, { params, body }) =>
  importOpeningBalancesFromRows(ctx, params.id, body.rows ?? []),
);
