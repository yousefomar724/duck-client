import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { updateBooking } from '@/server/finance/services/bookings';

export const PUT = financeWrite<{ id: string }>({ permission: P.bookingsManage }, (ctx, { params, body }) =>
  updateBooking(ctx, params.id, body),
);
