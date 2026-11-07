import { financeRead, financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getExpenses, createExpense } from '@/server/finance/services/receipts';

export const GET = financeRead({}, (ctx) => getExpenses(ctx));

export const POST = financeWrite({ permission: P.expensesCreate, status: 201 }, (ctx, { body }) => createExpense(ctx, body));
