import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { disposeOrSellAsset } from '@/server/finance/services/assets';

export const POST = financeWrite<{ id: string }>({ permission: P.assetsManage }, (ctx, { params, body }) =>
  disposeOrSellAsset(ctx, params.id, body),
);
