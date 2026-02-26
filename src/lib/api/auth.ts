'use client';

import { apiClient, ApiResponse } from './client';
import type { User, RegisterInput } from '@/lib/types';

export interface LoginResponse {
  token: string;
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
): Promise<ApiResponse<LoginResponse>> {
  return apiClient<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ google_token: googleToken }),
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
