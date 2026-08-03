import { describe, expect, it, vi } from 'vitest';
import { decodeToken, isTokenExpired } from '@/lib/auth/token';

function makeToken(payload: Record<string, unknown>) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('token', () => {
  it('decodes valid payload', () => {
    const token = makeToken({ user_id: 'u1', role: 1, exp: 9999999999 });
    expect(decodeToken(token)).toEqual({ user_id: 'u1', role: 1, exp: 9999999999 });
  });

  it('returns null for malformed token', () => {
    expect(decodeToken('bad')).toBeNull();
  });

  it('detects expired token', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const token = makeToken({ user_id: 'u1', role: 0, exp: 1 });
    expect(isTokenExpired(token)).toBe(true);
    vi.useRealTimers();
  });
});
