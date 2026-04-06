'use client';

import { apiClient, ApiResponse } from './client';
import { normalizeTrip, normalizeTrips } from './normalize-entities';
import type { Trip, CreateTripRequest } from '@/lib/types';

export async function getTrips(
  lang?: string,
  supplierId?: number,
  destinationId?: number,
): Promise<ApiResponse<Trip[]>> {
  let endpoint = '/trips';
  const params = new URLSearchParams();
  if (supplierId) params.append('supplier_id', supplierId.toString());
  if (destinationId) params.append('destination_id', destinationId.toString());
  if (params.toString()) endpoint += `?${params.toString()}`;

  const res = await apiClient<unknown>(endpoint, {
    method: 'GET',
    ...(lang !== undefined ? { lang } : {}),
  });
  if (res.error) {
    return { data: null, error: res.error };
  }
  if (res.data == null) {
    return { data: null, error: 'Unknown error' };
  }
  return { data: normalizeTrips(res.data), error: null };
}

/**
 * @param options.omitLang — use for edit forms so the API returns full `name`/`description` objects (not single-language strings).
 */
export async function getTrip(
  id: number,
  options?: { lang?: string; omitLang?: boolean },
): Promise<ApiResponse<Trip>> {
  const res = await apiClient<unknown>(`/trips/${id}`, {
    method: 'GET',
    ...(options ?? {}),
  });
  if (res.error) {
    return { data: null, error: res.error };
  }
  if (res.data == null) {
    return { data: null, error: 'Unknown error' };
  }
  return { data: normalizeTrip(res.data), error: null };
}

export async function getMyTrips(lang?: string): Promise<ApiResponse<Trip[]>> {
  const res = await apiClient<unknown>('/trips/my-trips', {
    method: 'GET',
    ...(lang !== undefined ? { lang } : {}),
  });
  if (res.error) {
    return { data: null, error: res.error };
  }
  if (res.data == null) {
    return { data: null, error: 'Unknown error' };
  }
  return { data: normalizeTrips(res.data), error: null };
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
