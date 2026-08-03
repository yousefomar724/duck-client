import { NextResponse } from 'next/server';
import { verifyAuthToken, type AuthClaims } from './jwt';
import { errorResponse } from '../lib/json';

export type Session = AuthClaims;

function extractBearer(request: Request): { token?: string; error?: NextResponse } {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!header) {
    return { error: errorResponse(401, 'Missing Authorization header') };
  }
  if (!header.startsWith('Bearer ')) {
    return { error: errorResponse(401, 'Invalid Authorization header format') };
  }
  return { token: header.slice('Bearer '.length) };
}

/** Requires a valid JWT. Returns the session or a ready-to-return 401 response. */
export function requireAuth(request: Request): Session | NextResponse {
  const { token, error } = extractBearer(request);
  if (error) return error;
  try {
    return verifyAuthToken(token!);
  } catch {
    return errorResponse(401, 'Invalid or expired token');
  }
}

/**
 * Requires a valid JWT AND role === 2 (admin).
 *
 * Fixes a Go-API bug: `middleware.AdminAuth` returned 401 for a role
 * mismatch, which the frontend's `apiClient` treats as an expired session
 * and force-logs-out the caller. 401 is reserved for missing/invalid tokens;
 * a valid non-admin token now gets 403.
 */
export function requireAdmin(request: Request): Session | NextResponse {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  if (session.role !== 2) {
    return errorResponse(403, 'Unauthorized');
  }
  return session;
}

/** Attaches a session when a valid bearer token is present; never blocks the request. */
export function optionalAuth(request: Request): Session | null {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    return verifyAuthToken(header.slice('Bearer '.length));
  } catch {
    return null;
  }
}
