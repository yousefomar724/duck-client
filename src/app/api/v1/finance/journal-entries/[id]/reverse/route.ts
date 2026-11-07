import { financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { reverseJournalEntry } from '@/server/finance/services/journals';

export const POST = financeWrite<{ id: string }>({ permission: P.journalsPost }, (ctx, { params, body }) =>
  reverseJournalEntry(ctx, params.id, typeof body.reason === 'string' && body.reason ? body.reason : 'User initiated reversal'),
);
