import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { createService } from '@/server/finance/services/settings';

export const POST = financeWrite({ permission: P.settingsManage, status: 201 }, (ctx, { body }) => createService(ctx, body));
