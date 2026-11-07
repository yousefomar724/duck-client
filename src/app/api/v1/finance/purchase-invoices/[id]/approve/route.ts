import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { approvePurchaseInvoice } from '@/server/finance/services/purchases';

export const POST = financeWrite<{ id: string }>({ permission: P.expensesCreate }, (ctx, { params }) =>
  approvePurchaseInvoice(ctx, params.id),
);
