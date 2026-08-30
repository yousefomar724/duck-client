import { NextResponse } from 'next/server';
import { isValidYmd } from '@/lib/time';
import { isValidSlotHHMM } from '@/lib/booking/occupancy';
import { errorResponse } from '@/server/lib/json';
import { getOpsHour } from '@/server/services/ops';
import { isOpsScopeError, resolveOpsScope } from '@/server/services/ops-scope';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = await resolveOpsScope(request, searchParams);
  if (isOpsScopeError(scope)) return scope;

  const date = searchParams.get('date');
  const time = searchParams.get('time');
  if (!date || !isValidYmd(date)) return errorResponse(400, 'Invalid date');
  if (!time || !isValidSlotHHMM(time)) return errorResponse(400, 'Invalid time');

  try {
    const data = await getOpsHour(scope.supplierId, date, time);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to load hour';
    return errorResponse(500, message);
  }
}
