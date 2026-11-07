import { financeRead, financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { createPurchaseInvoice, getPurchaseInvoices } from '@/server/finance/services/purchases';

export const GET = financeRead({}, (ctx) => getPurchaseInvoices(ctx));

export const POST = financeWrite({ permission: P.expensesCreate, status: 201 }, (ctx, { body }) =>
  createPurchaseInvoice(ctx, body),
);
