'use client';

import { apiClient, ApiResponse } from './client';
import type { Trip, CreateTripRequest } from '@/lib/types';

export async function getTrips(
  lang?: string,
  supplierId?: number,
): Promise<ApiResponse<Trip[]>> {
  let endpoint = '/trips';
  const params = new URLSearchParams();
  if (lang) params.append('lang', lang);
  if (supplierId) params.append('supplier_id', supplierId.toString());
  if (params.toString()) endpoint += `?${params.toString()}`;

  return apiClient<Trip[]>(endpoint, { method: 'GET' });
}

export async function getTrip(id: number, lang?: string): Promise<ApiResponse<Trip>> {
  let endpoint = `/trips/${id}`;
  if (lang) endpoint += `?lang=${lang}`;
  return apiClient<Trip>(endpoint, { method: 'GET' });
}

export async function getMyTrips(lang?: string): Promise<ApiResponse<Trip[]>> {
  let endpoint = '/trips/my-trips';
  if (lang) endpoint += `?lang=${lang}`;
  return apiClient<Trip[]>(endpoint, { method: 'GET' });
}

export async function createTrip(data: CreateTripRequest): Promise<ApiResponse<Trip>> {
  return apiClient<Trip>('/trips', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTrip(
  id: number,
  data: Partial<CreateTripRequest>,
): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>(`/trips/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTrip(id: number): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>(`/trips/${id}`, {
    method: 'DELETE',
  });
}
