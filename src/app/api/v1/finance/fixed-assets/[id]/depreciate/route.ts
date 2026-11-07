import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { runMonthlyDepreciation } from '@/server/finance/services/assets';

export const POST = financeWrite<{ id: string }>({ permission: P.assetsManage }, (ctx, { params }) =>
  runMonthlyDepreciation(ctx, params.id),
);
