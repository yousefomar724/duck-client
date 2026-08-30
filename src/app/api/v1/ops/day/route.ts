import { NextResponse } from 'next/server';
import { isValidYmd } from '@/lib/time';
import { errorResponse } from '@/server/lib/json';
import { getOpsDay } from '@/server/services/ops';
import { isOpsScopeError, resolveOpsScope } from '@/server/services/ops-scope';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = await resolveOpsScope(request, searchParams);
  if (isOpsScopeError(scope)) return scope;

  const date = searchParams.get('date');
  if (!date || !isValidYmd(date)) return errorResponse(400, 'Invalid date');

  try {
    const data = await getOpsDay(scope.supplierId, date);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to load day';
    return errorResponse(500, message);
  }
}
