'use client';

const TOKEN_KEY = 'duck_auth_token';

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export interface DecodedToken {
  user_id: number;
  role: number;
  exp: number;
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1])) as unknown;

    if (
      typeof payload === 'object' &&
      payload !== null &&
      'user_id' in payload &&
      'role' in payload &&
      'exp' in payload
    ) {
      return {
        user_id: (payload as Record<string, unknown>).user_id as number,
        role: (payload as Record<string, unknown>).role as number,
        exp: (payload as Record<string, unknown>).exp as number,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  return decoded.exp < Date.now() / 1000;
}
