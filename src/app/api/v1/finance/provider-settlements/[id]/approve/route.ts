import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { approveProviderSettlement } from '@/server/finance/services/settlements';

export const POST = financeWrite<{ id: string }>({ permission: P.journalsPost }, (ctx, { params }) =>
  approveProviderSettlement(ctx, params.id),
);
