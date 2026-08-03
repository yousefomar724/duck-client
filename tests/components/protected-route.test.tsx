import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { renderWithIntl } from '../utils/render';
import { setToken } from '@/lib/auth/token';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/stores/auth-store', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/lib/stores/auth-store';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    localStorage.clear();
  });

  it('renders children for allowed role', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', role: 2 } as never,
      isLoading: false,
      isAuthenticated: true,
    } as never);

    renderWithIntl(
      <ProtectedRoute allowedRoles={[2]}>
        <div>Admin content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });

  it('allows supplier via token fallback', () => {
    setToken(
      [
        btoa(JSON.stringify({ alg: 'HS256' })),
        btoa(JSON.stringify({ user_id: 's1', role: 1, exp: 9999999999 })),
        'sig',
      ].join('.'),
    );

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 's1', role: 0, supplier_id: 'sup1' } as never,
      isLoading: false,
      isAuthenticated: true,
    } as never);

    renderWithIntl(
      <ProtectedRoute allowedRoles={[1]}>
        <div>Supplier content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Supplier content')).toBeInTheDocument();
  });
});
