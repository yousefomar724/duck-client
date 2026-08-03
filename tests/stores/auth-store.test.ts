import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useAuth } from '@/lib/stores/auth-store';
import * as authApi from '@/lib/api/auth';
import { setToken } from '@/lib/auth/token';

vi.mock('@/lib/api/auth');
vi.mock('@/lib/api/suppliers');
vi.mock('@/lib/api/supplier-storage');

describe('auth store', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuth.setState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      effectiveRole: null,
      onboardingComplete: null,
      onboardingSkipped: false,
      _initialized: false,
    });
    vi.clearAllMocks();
  });

  it('login stores token and user', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      data: { token: 'jwt-token' },
      error: null,
    });
    vi.mocked(authApi.getMe).mockResolvedValue({
      data: { id: 'u1', email: 'test@test.com', role: 0 } as never,
      error: null,
    });

    const result = await useAuth.getState().login('test@test.com', 'password');
    expect(result.error).toBeUndefined();
    expect(useAuth.getState().isAuthenticated).toBe(true);
    expect(getToken()).toBe('jwt-token');
  });

  it('logout clears session', async () => {
    setToken('old-token');
    useAuth.setState({
      user: { id: 'u1' } as never,
      token: 'old-token',
      isAuthenticated: true,
    });

    await useAuth.getState().logout();
    expect(useAuth.getState().isAuthenticated).toBe(false);
    expect(getToken()).toBeNull();
  });
});

function getToken() {
  return localStorage.getItem('duck_auth_token');
}
