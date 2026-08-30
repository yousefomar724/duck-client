import { NextResponse } from 'next/server';
import { errorResponse } from '@/server/lib/json';
import { getCustomers } from '@/server/services/ops';
import { isOpsScopeError, resolveOpsScope } from '@/server/services/ops-scope';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = await resolveOpsScope(request, searchParams);
  if (isOpsScopeError(scope)) return scope;

  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') ?? '20', 10) || 20));

  try {
    const data = await getCustomers(scope.supplierId, q, page, limit);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to load customers';
    return errorResponse(500, message);
  }
}
