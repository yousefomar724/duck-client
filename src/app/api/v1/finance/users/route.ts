import { financeRead, financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { listUsers, createUser } from '@/server/finance/services/users';

export const GET = financeRead({ permission: P.usersManage }, (ctx) => listUsers(ctx));

export const POST = financeWrite({ permission: P.usersManage, status: 201 }, (ctx, { body }) => createUser(ctx, body));
