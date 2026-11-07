import { financeRead, financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getBookings, createBooking } from '@/server/finance/services/bookings';

export const GET = financeRead({}, (ctx) => getBookings(ctx));

export const POST = financeWrite({ permission: P.bookingsManage, status: 201 }, (ctx, { body }) => createBooking(ctx, body));
