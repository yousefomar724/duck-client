import { financeRead } from '@/server/finance/http';
import { getDepreciationRuns } from '@/server/finance/services/assets';

export const GET = financeRead({}, (ctx) => getDepreciationRuns(ctx));
