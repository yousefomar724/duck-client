import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { unlockPeriod } from '@/server/finance/services/periods';

export const POST = financeWrite<{ id: string }>({ permission: P.periodLock }, (ctx, { params }) => unlockPeriod(ctx, params.id));
