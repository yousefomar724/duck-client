import { financeRead, financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getOfficialTrips, createOfficialTrip } from '@/server/finance/services/catalog';

export const GET = financeRead({}, (ctx) => getOfficialTrips(ctx));

export const POST = financeWrite({ permission: P.catalogManage, status: 201 }, (ctx, { body }) =>
  createOfficialTrip(ctx, body),
);
