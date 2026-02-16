'use client';

import { getToken, clearToken } from '@/lib/auth/token';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  lang?: string;
  headers?: HeadersInit;
}

async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  try {
    const token = getToken();
    const url = new URL(`${API_BASE}${endpoint}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

    // Add language query parameter
    const lang = options.lang || (typeof window !== 'undefined' ? document.documentElement.lang : 'ar');
    if (lang && !endpoint.includes('?')) {
      url.searchParams.set('lang', lang);
    } else if (lang && endpoint.includes('?')) {
      url.searchParams.set('lang', lang);
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

    // Handle unauthorized - clear token, notify auth, redirect to login
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
    const url = new URL(`${API_BASE}${endpoint}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

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
