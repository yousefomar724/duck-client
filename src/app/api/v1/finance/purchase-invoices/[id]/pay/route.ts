import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { payPurchaseInvoice } from '@/server/finance/services/purchases';

export const POST = financeWrite<{ id: string }>({ permission: P.expensesCreate }, (ctx, { params, body }) =>
  payPurchaseInvoice(ctx, params.id, body),
);
