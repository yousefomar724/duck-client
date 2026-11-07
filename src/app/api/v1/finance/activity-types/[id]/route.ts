import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { updateActivityType, deleteActivityType } from '@/server/finance/services/catalog';

export const PUT = financeWrite<{ id: string }>({ permission: P.catalogManage }, (ctx, { params, body }) =>
  updateActivityType(ctx, params.id, body),
);

export const DELETE = financeWrite<{ id: string }>({ permission: P.catalogManage }, async (ctx, { params }) => {
  await deleteActivityType(ctx, params.id);
  return { success: true, id: params.id };
});
