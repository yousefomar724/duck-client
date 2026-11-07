import { financeRead } from '@/server/finance/http';
import { getState } from '@/server/finance/services/state';

export const GET = financeRead({}, (ctx) => getState(ctx));
