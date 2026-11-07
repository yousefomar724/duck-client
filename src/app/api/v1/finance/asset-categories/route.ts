import { financeRead, financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getAssetCategories, createAssetCategory } from '@/server/finance/services/assets';

export const GET = financeRead({}, (ctx) => getAssetCategories(ctx));

export const POST = financeWrite({ permission: P.assetsManage, status: 201 }, (ctx, { body }) =>
  createAssetCategory(ctx, body),
);
