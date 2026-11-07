import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { executeMonthlyDepreciation } from '@/server/finance/services/assets';

export const POST = financeWrite({ permission: P.assetsManage }, (ctx, { body }) =>
  executeMonthlyDepreciation(ctx, Number(body.year), Number(body.month)),
);
