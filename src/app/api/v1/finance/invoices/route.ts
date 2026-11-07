import { financeRead, financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getInvoices, createInvoice } from '@/server/finance/services/invoices';

export const GET = financeRead({}, (ctx) => getInvoices(ctx));

export const POST = financeWrite({ permission: P.invoicesCreate, status: 201 }, (ctx, { body }) => createInvoice(ctx, body));
