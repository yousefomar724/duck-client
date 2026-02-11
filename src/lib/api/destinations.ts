'use client';

import { apiClient, ApiResponse } from './client';
import type { Destination } from '@/lib/types';

export interface CreateDestinationInput {
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  image: string;
  status?: string;
}

export async function getDestinations(
  lang?: string,
  status?: string,
): Promise<ApiResponse<Destination[]>> {
  let endpoint = '/destinations';
  const params = new URLSearchParams();
  if (lang) params.append('lang', lang);
  if (status) params.append('status', status);
  if (params.toString()) endpoint += `?${params.toString()}`;

  return apiClient<Destination[]>(endpoint, { method: 'GET' });
}

export async function getDestination(id: number, lang?: string): Promise<ApiResponse<Destination>> {
  let endpoint = `/destinations/${id}`;
  if (lang) endpoint += `?lang=${lang}`;
  return apiClient<Destination>(endpoint, { method: 'GET' });
}

export async function createDestination(
  data: CreateDestinationInput,
): Promise<ApiResponse<Destination>> {
  return apiClient<Destination>('/destinations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDestination(
  id: number,
  data: Partial<CreateDestinationInput>,
): Promise<ApiResponse<Destination>> {
  return apiClient<Destination>(`/destinations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteDestination(id: number): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>(`/destinations/${id}`, {
    method: 'DELETE',
  });
}
