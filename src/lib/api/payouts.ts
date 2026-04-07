'use client';

import { apiClient, ApiResponse } from './client';
import type { Payout } from '@/lib/types';

export interface CreatePayoutInput {
  supplier_id: number;
  amount: number;
  currency?: string;
  status?: string;
}

export async function getPayouts(
  status?: string,
  supplierId?: number,
): Promise<ApiResponse<Payout[]>> {
  let endpoint = '/payouts';
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (supplierId) params.append('supplier_id', supplierId.toString());
  if (params.toString()) endpoint += `?${params.toString()}`;

  return apiClient<Payout[]>(endpoint, { method: 'GET', omitLang: true });
}

export async function getPayout(id: number): Promise<ApiResponse<Payout>> {
  return apiClient<Payout>(`/payouts/${id}`, { method: 'GET', omitLang: true });
}

export async function createPayout(data: CreatePayoutInput): Promise<ApiResponse<Payout>> {
  return apiClient<Payout>('/payouts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePayout(
  id: number,
  data: Partial<CreatePayoutInput>,
): Promise<ApiResponse<Payout>> {
  return apiClient<Payout>(`/payouts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    omitLang: true,
  });
}

export async function deletePayout(id: number): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>(`/payouts/${id}`, {
    method: 'DELETE',
    omitLang: true,
  });
}
