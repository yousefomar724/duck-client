import { financeRead } from '@/server/finance/http';
import { getSettings } from '@/server/finance/services/settings';

export const GET = financeRead({}, (ctx) => getSettings(ctx));
