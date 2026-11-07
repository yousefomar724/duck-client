import { financeRead } from '@/server/finance/http';
import { previewMonthlyDepreciation } from '@/server/finance/services/assets';

export const GET = financeRead({}, (ctx, { query }) => {
  const now = new Date();
  const year = Number.parseInt(query.get('year') ?? '', 10) || now.getFullYear();
  const month = Number.parseInt(query.get('month') ?? '', 10) || now.getMonth() + 1;
  return previewMonthlyDepreciation(ctx, year, month);
});
