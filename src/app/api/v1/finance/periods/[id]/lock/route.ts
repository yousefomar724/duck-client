import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { lockPeriod } from '@/server/finance/services/periods';

export const POST = financeWrite<{ id: string }>({ permission: P.periodLock }, (ctx, { params }) => lockPeriod(ctx, params.id));
