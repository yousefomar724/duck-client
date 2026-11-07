import { financeCustom } from '@/server/finance/http';
import { PERMISSIONS as P } from '@/server/finance/auth/permissions';
import { runFullAcceptanceTest } from '@/server/finance/services/acceptance';

// Runs on throwaway fin_acctest_* collections; never touches the real books.
export const POST = financeCustom({ permission: P.acceptanceRun }, ({ actor }) => runFullAcceptanceTest(actor));
