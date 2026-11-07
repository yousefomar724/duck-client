import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { updateUser } from '@/server/finance/services/users';

export const PUT = financeWrite<{ id: string }>({ permission: P.usersManage }, (ctx, { params, body }) =>
  updateUser(ctx, params.id, body),
);
