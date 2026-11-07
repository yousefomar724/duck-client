import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { updateAssetCategory } from '@/server/finance/services/assets';

export const PUT = financeWrite<{ id: string }>({ permission: P.assetsManage }, (ctx, { params, body }) =>
  updateAssetCategory(ctx, params.id, body),
);
