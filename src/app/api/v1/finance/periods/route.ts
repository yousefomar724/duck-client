import { financeRead } from '@/server/finance/http';
import { getPeriods } from '@/server/finance/services/periods';

export const GET = financeRead({}, (ctx) => getPeriods(ctx));
