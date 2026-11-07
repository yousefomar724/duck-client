import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { updateTourTypes } from '@/server/finance/services/settings';

export const PUT = financeWrite({ permission: P.settingsManage }, (ctx, { body }) =>
  updateTourTypes(ctx, body.tourTypes ?? body.items),
);
