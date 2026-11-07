import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { payProviderSettlement } from '@/server/finance/services/settlements';

export const POST = financeWrite<{ id: string }>({ permission: P.expensesCreate }, (ctx, { params, body }) =>
  payProviderSettlement(ctx, params.id, body),
);
