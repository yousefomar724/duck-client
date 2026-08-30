import { NextResponse } from 'next/server';
import { errorResponse } from '@/server/lib/json';
import { markNotificationsRead } from '@/server/services/ops';
import { isOpsScopeError, resolveOpsScope } from '@/server/services/ops-scope';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = await resolveOpsScope(request, searchParams);
  if (isOpsScopeError(scope)) return scope;

  let keys: string[] | undefined;
  try {
    const body = await request.json();
    if (Array.isArray(body?.keys)) keys = body.keys.filter((k: unknown) => typeof k === 'string');
  } catch {
    keys = undefined;
  }

  try {
    await markNotificationsRead(scope.userId, keys);
    return NextResponse.json({ message: 'ok' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to mark read';
    return errorResponse(500, message);
  }
}
