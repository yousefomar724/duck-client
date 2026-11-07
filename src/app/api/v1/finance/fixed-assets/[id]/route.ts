import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { updateFixedAsset } from '@/server/finance/services/assets';

export const PUT = financeWrite<{ id: string }>({ permission: P.assetsManage }, (ctx, { params, body }) =>
  updateFixedAsset(ctx, params.id, body),
);
