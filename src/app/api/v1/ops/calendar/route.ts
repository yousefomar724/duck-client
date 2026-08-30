import { NextResponse } from 'next/server';
import { isValidYearMonth } from '@/lib/time';
import { errorResponse } from '@/server/lib/json';
import { getOpsCalendar } from '@/server/services/ops';
import { isOpsScopeError, resolveOpsScope } from '@/server/services/ops-scope';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = await resolveOpsScope(request, searchParams);
  if (isOpsScopeError(scope)) return scope;

  const month = searchParams.get('month');
  if (!month || !isValidYearMonth(month)) {
    return errorResponse(400, 'Invalid month');
  }
  const peak = searchParams.get('peak') === '1';

  try {
    const data = await getOpsCalendar(scope.supplierId, month, peak);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to load calendar';
    return errorResponse(500, message);
  }
}
