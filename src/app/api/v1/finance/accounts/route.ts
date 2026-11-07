import { financeRead, financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getAccounts, createAccount } from '@/server/finance/services/accounts';

export const GET = financeRead({}, (ctx) => getAccounts(ctx));

export const POST = financeWrite({ permission: P.accountsManage, status: 201 }, (ctx, { body }) => createAccount(ctx, body));
