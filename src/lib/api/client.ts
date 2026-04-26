'use client';

import { getToken, clearToken } from '@/lib/auth/token';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  lang?: string;
  /** When true, do not send `lang` (use for admin/edit payloads with full `{ ar, en }` fields). */
  omitLang?: boolean;
  headers?: HeadersInit;
}

async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  try {
    const token = getToken();
    const url = new URL(`${API_BASE}${endpoint}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080');

    // Language query (optional; omit for full bilingual JSON from Go)
    if (!options.omitLang) {
      const lang =
        options.lang !== undefined
          ? options.lang
          : typeof window !== 'undefined'
            ? document.documentElement.lang
            : 'ar';
      if (lang) {
        url.searchParams.set('lang', lang);
      }
    }

    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      baseHeaders['Authorization'] = `Bearer ${token}`;
    }

    const headers: HeadersInit = {
      ...baseHeaders,
      ...(options.headers || {}),
    };

    const response = await fetch(url.toString(), {
      ...options,
      headers,
    });

    const requestMethod = (options.method || 'GET').toString().toUpperCase();
    // Login 401s mean wrong credentials (or similar) — not an expired session. Read body, no redirect.
    if (
      response.status === 401 &&
      endpoint === '/auth/login' &&
      requestMethod === 'POST'
    ) {
      clearToken();
      const body = await response.json().catch(() => ({}));
      const errorMessage =
        typeof (body as { error?: string }).error === 'string'
          ? (body as { error: string }).error
          : 'invalid credentials';
      return { data: null, error: errorMessage };
    }

    if (response.status === 401) {
      clearToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        window.location.href = '/login';
      }
      return { data: null, error: 'Unauthorized' };
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const errorMessage = typeof body.error === 'string' ? body.error : `HTTP ${response.status}`;
      return { data: null, error: errorMessage };
    }

    const data = await response.json() as T;
    return { data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return { data: null, error: message };
  }
}

// File upload helper - doesn't set Content-Type header (let browser set boundary)
async function uploadFile<T>(
  endpoint: string,
  file: File,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const token = getToken();
    const url = new URL(`${API_BASE}${endpoint}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080');

    const formData = new FormData();
    formData.append('image', file);

    const baseHeaders: Record<string, string> = {};

    if (token) {
      baseHeaders['Authorization'] = `Bearer ${token}`;
    }

    const headers: HeadersInit = {
      ...baseHeaders,
      ...(options.headers || {}),
    };

    const response = await fetch(url.toString(), {
      method: 'POST',
      ...options,
      headers,
      body: formData,
    });

    if (response.status === 401) {
      clearToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        window.location.href = '/login';
      }
      return { data: null, error: 'Unauthorized' };
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const errorMessage = typeof body.error === 'string' ? body.error : `HTTP ${response.status}`;
      return { data: null, error: errorMessage };
    }

    const data = await response.json() as T;
    return { data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return { data: null, error: message };
  }
}

export { apiClient, uploadFile };
