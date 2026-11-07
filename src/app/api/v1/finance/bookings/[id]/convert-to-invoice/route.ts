import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { convertBookingToInvoice } from '@/server/finance/services/bookings';

export const POST = financeWrite<{ id: string }>({ permission: P.invoicesCreate, status: 201 }, (ctx, { params }) =>
  convertBookingToInvoice(ctx, params.id),
);
