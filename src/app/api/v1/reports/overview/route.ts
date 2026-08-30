import { NextResponse } from 'next/server';
import { isValidYmd } from '@/lib/time';
import { errorResponse } from '@/server/lib/json';
import { getReportsOverview } from '@/server/services/ops';
import { isOpsScopeError, resolveOpsScope } from '@/server/services/ops-scope';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = await resolveOpsScope(request, searchParams);
  if (isOpsScopeError(scope)) return scope;

  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !isValidYmd(from) || !to || !isValidYmd(to)) {
    return errorResponse(400, 'Invalid date range');
  }

  try {
    const data = await getReportsOverview(scope.supplierId, from, to);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to load reports';
    return errorResponse(500, message);
  }
}
