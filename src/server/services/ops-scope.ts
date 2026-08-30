import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { findActiveUserById } from '@/server/services/user';
import { errorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

export type OpsRole = 1 | 2;

export interface OpsScope {
  supplierId: string | null;
  role: OpsRole;
  userId: string;
}

export function isOpsScopeError(
  value: OpsScope | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}

/**
 * Role 2: optional `supplier_id` (null = all suppliers).
 * Role 1: forced to the user's supplier; query `supplier_id` is ignored.
 */
export async function resolveOpsScope(
  request: Request,
  searchParams: URLSearchParams,
): Promise<OpsScope | NextResponse> {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  if (session.role !== 1 && session.role !== 2) {
    return errorResponse(403, 'Unauthorized');
  }

  await dbConnect();
  const user = await findActiveUserById(session.user_id);
  if (!user) return errorResponse(403, 'user not found');

  if (session.role === 1) {
    if (!user.supplier_id) return errorResponse(403, 'user is not a supplier');
    return {
      supplierId: user.supplier_id.toString(),
      role: 1,
      userId: user.id,
    };
  }

  const requested = searchParams.get('supplier_id');
  if (requested && !isValidObjectId(requested)) {
    return errorResponse(400, 'Invalid supplier ID');
  }
  return {
    supplierId: requested || null,
    role: 2,
    userId: user.id,
  };
}
