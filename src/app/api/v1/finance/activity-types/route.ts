import { financeRead, financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getActivityTypes, createActivityType } from '@/server/finance/services/catalog';

export const GET = financeRead({}, (ctx) => getActivityTypes(ctx));

export const POST = financeWrite({ permission: P.catalogManage, status: 201 }, (ctx, { body }) =>
  createActivityType(ctx, body),
);
