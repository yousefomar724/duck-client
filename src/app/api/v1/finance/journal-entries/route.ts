import { financeRead, financeWrite } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { getJournalEntries, createManualJournal } from '@/server/finance/services/journals';

export const GET = financeRead({}, (ctx) => getJournalEntries(ctx));

// Saving a draft needs journals:draft; posting needs journals:post.
export const POST = financeWrite(
  { permission: ({ body }) => (body.status === 'draft' ? P.journalsDraft : P.journalsPost), status: 201 },
  (ctx, { body }) => createManualJournal(ctx, body),
);
