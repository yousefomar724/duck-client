import { financeRead, financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getCustomerReceipts, createCustomerReceipt } from '@/server/finance/services/receipts';

export const GET = financeRead({}, (ctx) => getCustomerReceipts(ctx));

export const POST = financeWrite({ permission: P.receiptsCreate, status: 201 }, (ctx, { body }) =>
  createCustomerReceipt(ctx, body),
);
