import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { server } from '../msw/server';
import { apiClient } from '@/lib/api/client';
import { setToken, clearToken } from '@/lib/auth/token';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  clearToken();
});
afterAll(() => server.close());

describe('apiClient', () => {
  it('appends lang query param by default', async () => {
    document.documentElement.lang = 'en';
    const result = await apiClient<[]>('/trips');
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('returns login error without redirect on 401', async () => {
    const result = await apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'bad@test.com', password: 'wrong' }),
    });
    expect(result.error).toBe('invalid credentials');
  });

  it('sends authorization header when token present', async () => {
    setToken('valid-token');
    const result = await apiClient('/auth/me');
    expect(result.data).toMatchObject({ email: 'good@test.com' });
  });
});
