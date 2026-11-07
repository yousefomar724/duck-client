import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { updateOfficialTrip, deleteOfficialTrip } from '@/server/finance/services/catalog';

// A price change additionally needs pricing:approve (checked in the service).
export const PUT = financeWrite<{ id: string }>({ permission: P.catalogManage }, (ctx, { params, body }) =>
  updateOfficialTrip(ctx, params.id, body),
);

export const DELETE = financeWrite<{ id: string }>({ permission: P.catalogManage }, async (ctx, { params }) => {
  await deleteOfficialTrip(ctx, params.id);
  return { success: true, id: params.id };
});
