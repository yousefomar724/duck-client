'use client';

import { apiClient, ApiResponse } from './client';
import type { Wallet } from '@/lib/types';

export async function getWallet(userId: number): Promise<ApiResponse<Wallet>> {
  return apiClient<Wallet>(`/wallet/${userId}`, { method: 'GET' });
}

export async function getAllWallets(): Promise<ApiResponse<Wallet[]>> {
  return apiClient<Wallet[]>('/wallet', { method: 'GET' });
}

export async function updateBalance(
  userId: number,
  amount: number,
): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>(`/wallet/${userId}/${amount}`, {
    method: 'PATCH',
  });
}
