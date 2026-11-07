import { financeRead, financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getFixedAssets, createFixedAsset } from '@/server/finance/services/assets';

export const GET = financeRead({}, (ctx) => getFixedAssets(ctx));

export const POST = financeWrite({ permission: P.assetsManage, status: 201 }, (ctx, { body }) => createFixedAsset(ctx, body));
