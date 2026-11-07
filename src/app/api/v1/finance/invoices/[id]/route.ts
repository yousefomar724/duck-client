import { financeRead } from '@/server/finance/http';
import { getInvoice } from '@/server/finance/services/invoices';

export const GET = financeRead<{ id: string }>({}, (ctx, { params }) => getInvoice(ctx, params.id));
