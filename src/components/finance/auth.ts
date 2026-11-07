'use client';

/**
 * Finance (ERP) auth + HTTP client.
 *
 * The token lives under its own localStorage key so a Duck customer/admin
 * session (`duck_auth_token`, see src/lib/auth/token.ts) and a finance staff
 * session never overwrite or log each other out.
 */

const TOKEN_KEY = 'duck_finance_token';

export const FINANCE_API_BASE = '/api/v1/finance';
export const FINANCE_LOGIN_PATH = '/finance/login';

export function getFinanceToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setFinanceToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage blocked: the session just won't survive a reload.
  }
}

export function clearFinanceToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** Fired when the API answers 401 so the provider can drop its session. */
export const FINANCE_UNAUTHORIZED_EVENT = 'duck:finance-unauthorized';

/**
 * fetch() against the finance API. `path` is the ERP's original Express path
 * without the `/api` prefix (e.g. `/state`, `/invoices/12`); it is mounted at
 * `/api/v1/finance`. Adds the Bearer token and, on 401, clears the stored
 * token and sends the user to the login page.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getFinanceToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${FINANCE_API_BASE}${path}`, { ...init, headers });

  if (res.status === 401 && typeof window !== 'undefined') {
    clearFinanceToken();
    window.dispatchEvent(new Event(FINANCE_UNAUTHORIZED_EVENT));
    if (window.location.pathname !== FINANCE_LOGIN_PATH) {
      window.location.assign(FINANCE_LOGIN_PATH);
    }
  }
  return res;
}
