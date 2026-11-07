import { financeRead, financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getCustomRoles, createCustomRole } from '@/server/finance/services/settings';

export const GET = financeRead({}, (ctx) => getCustomRoles(ctx));

export const POST = financeWrite({ permission: P.usersManage, status: 201 }, (ctx, { body }) =>
  createCustomRole(ctx, body),
);
