import { NextResponse } from 'next/server';
import { toSiteYmd } from '@/lib/time';
import { errorResponse } from '@/server/lib/json';
import { listOpsNotifications } from '@/server/services/ops';
import { isOpsScopeError, resolveOpsScope } from '@/server/services/ops-scope';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = await resolveOpsScope(request, searchParams);
  if (isOpsScopeError(scope)) return scope;

  const basePath = scope.role === 1 ? '/supplier' : '/admin';
  try {
    const items = await listOpsNotifications(
      scope.supplierId,
      scope.userId,
      toSiteYmd(new Date()),
      basePath,
    );
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to load notifications';
    return errorResponse(500, message);
  }
}
