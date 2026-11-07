import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { updateCustomRole, deleteCustomRole } from '@/server/finance/services/settings';

export const PUT = financeWrite<{ id: string }>({ permission: P.usersManage }, (ctx, { params, body }) =>
  updateCustomRole(ctx, params.id, body),
);

export const DELETE = financeWrite<{ id: string }>({ permission: P.usersManage }, async (ctx, { params }) => {
  await deleteCustomRole(ctx, params.id);
  return { success: true, id: params.id };
});
