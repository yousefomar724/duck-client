import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { updateInternalControls } from '@/server/finance/services/settings';

export const PUT = financeWrite({ permission: P.controlsManage }, (ctx, { body }) => updateInternalControls(ctx, body));
