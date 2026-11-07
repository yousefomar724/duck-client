import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { updateAccount } from '@/server/finance/services/accounts';

export const PUT = financeWrite<{ code: string }>({ permission: P.accountsManage }, (ctx, { params, body }) =>
  updateAccount(ctx, params.code, body),
);
