'use client';

import { apiClient, ApiResponse } from './client';
import type { Supplier } from '@/lib/types';

export interface UpdateSupplierInput {
  name?: { ar: string; en: string };
  about?: { ar: string; en: string };
  icon?: string;
}

export async function getSuppliers(lang?: string): Promise<ApiResponse<Supplier[]>> {
  let endpoint = '/suppliers';
  if (lang) endpoint += `?lang=${lang}`;
  return apiClient<Supplier[]>(endpoint, { method: 'GET' });
}

export async function getSupplier(id: number, lang?: string): Promise<ApiResponse<Supplier>> {
  let endpoint = `/suppliers/${id}`;
  if (lang) endpoint += `?lang=${lang}`;
  return apiClient<Supplier>(endpoint, { method: 'GET' });
}

export async function updateSupplier(
  id: number,
  data: UpdateSupplierInput,
  lang?: string,
): Promise<ApiResponse<Supplier>> {
  let endpoint = `/suppliers/${id}`;
  if (lang) endpoint += `?lang=${lang}`;
  return apiClient<Supplier>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSupplier(id: number): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>(`/suppliers/${id}`, {
    method: 'DELETE',
  });
}
