import { financeRead } from '@/server/finance/http';
import { auditExcelRecords } from '@/server/finance/services/reports';

// Read-only analysis of uploaded rows; writes nothing.
export const POST = financeRead({}, async (_ctx, { body }) => auditExcelRecords(body.records ?? []));
