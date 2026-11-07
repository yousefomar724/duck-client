import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { updateCaptains } from '@/server/finance/services/settings';

export const PUT = financeWrite({ permission: P.settingsManage }, (ctx, { body }) =>
  updateCaptains(ctx, body.captains ?? body.items),
);
