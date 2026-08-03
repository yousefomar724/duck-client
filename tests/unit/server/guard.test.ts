import { describe, expect, it } from 'vitest';
import { NextResponse } from 'next/server';
import { signAuthToken } from '@/server/auth/jwt';
import { requireAuth, requireAdmin, optionalAuth } from '@/server/auth/guard';
import { jsonRequest } from '../../utils/http';

describe('guard', () => {
  it('requireAuth rejects missing header', async () => {
    const res = requireAuth(jsonRequest('http://localhost/api')) as NextResponse;
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: 'Missing Authorization header' });
  });

  it('requireAuth rejects malformed header', async () => {
    const res = requireAuth(
      jsonRequest('http://localhost/api', { headers: { Authorization: 'Token abc' } }),
    ) as NextResponse;
    expect(res.status).toBe(401);
  });

  it('requireAuth accepts valid token', () => {
    const token = signAuthToken({ user_id: 'u1', role: 0 });
    const session = requireAuth(jsonRequest('http://localhost/api', { token }));
    expect(session).toMatchObject({ user_id: 'u1', role: 0 });
  });

  it('requireAdmin returns 403 for non-admin', async () => {
    const token = signAuthToken({ user_id: 'u1', role: 0 });
    const res = requireAdmin(jsonRequest('http://localhost/api', { token })) as NextResponse;
    expect(res.status).toBe(403);
  });

  it('requireAdmin accepts admin', () => {
    const token = signAuthToken({ user_id: 'admin', role: 2 });
    expect(requireAdmin(jsonRequest('http://localhost/api', { token }))).toMatchObject({
      user_id: 'admin',
      role: 2,
    });
  });

  it('optionalAuth returns null without header', () => {
    expect(optionalAuth(jsonRequest('http://localhost/api'))).toBeNull();
  });

  it('optionalAuth returns session with valid token', () => {
    const token = signAuthToken({ user_id: 'u1', role: 1 });
    expect(optionalAuth(jsonRequest('http://localhost/api', { token }))).toMatchObject({
      user_id: 'u1',
      role: 1,
    });
  });
});
