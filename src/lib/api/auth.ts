'use client';

import { apiClient, ApiResponse } from './client';
import type { User, RegisterInput } from '@/lib/types';

export interface LoginResponse {
  token: string;
}

/** Body for POST /auth/login when using Google Sign-In (ID token JWT). */
export type GoogleLoginBody = {
  google_token: string;
  role: 0 | 1;
};

/**
 * Trims and validates that the value looks like a JWT (Google ID token from CredentialResponse).
 * Returns null if invalid so callers can fail fast without hitting the API.
 */
export function normalizeGoogleIdToken(token: unknown): string | null {
  if (typeof token !== 'string') return null;
  const trimmed = token.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('.');
  if (parts.length !== 3) return null;
  return trimmed;
}

export async function login(
  email: string,
  password: string,
): Promise<ApiResponse<LoginResponse>> {
  return apiClient<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function loginWithGoogle(
  googleToken: string,
  role: 0 | 1,
): Promise<ApiResponse<LoginResponse>> {
  const google_token = normalizeGoogleIdToken(googleToken);
  if (!google_token) {
    return { data: null, error: 'Invalid Google credential' };
  }
  const body: GoogleLoginBody = { google_token, role };
  return apiClient<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function register(
  input: RegisterInput,
): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function forgotPassword(
  email: string,
): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export async function getMe(): Promise<ApiResponse<User>> {
  return apiClient<User>('/auth/me', {
    method: 'GET',
  });
}

export async function activateUser(
  userId: number,
  activate: boolean,
): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>(
    `/auth/activate?id=${userId}&activate=${activate}`,
    { method: 'PATCH' },
  );
}

export async function deleteUser(
  userId: number,
): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>(`/auth/delete?id=${userId}`, {
    method: 'PATCH',
  });
}
