import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { updateServices } from '@/server/finance/services/settings';

export const PUT = financeWrite({ permission: P.settingsManage }, (ctx, { body }) =>
  updateServices(ctx, body.services ?? body.items),
);
