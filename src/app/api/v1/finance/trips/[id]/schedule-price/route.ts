import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { schedulePriceChange } from '@/server/finance/services/catalog';

export const POST = financeWrite<{ id: string }>({ permission: P.pricingApprove, status: 201 }, (ctx, { params, body }) =>
  schedulePriceChange(ctx, params.id, body),
);
