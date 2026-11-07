import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { deleteService } from '@/server/finance/services/settings';

export const DELETE = financeWrite<{ id: string }>({ permission: P.settingsManage }, async (ctx, { params }) => {
  await deleteService(ctx, params.id);
  return { success: true, id: params.id };
});
