'use client';

import { apiClient, ApiResponse } from './client';
import { normalizeDestination, normalizeDestinations } from './normalize-entities';
import type { Destination, DestinationActivity, DestinationPublicStatus } from '@/lib/types';

export interface CreateDestinationInput {
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  image: string;
  images?: string[];
  status?: string;
  lat?: number;
  lng?: number;
  activities?: DestinationActivity[];
  public_status?: DestinationPublicStatus;
  operating_hours?: string;
}

export async function getDestinations(
  lang?: string,
  status?: string,
  public_status?: string,
): Promise<ApiResponse<Destination[]>> {
  let endpoint = '/destinations';
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (public_status) params.append('public_status', public_status);
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
  return { data: normalizeDestinations(res.data), error: null };
}

/**
 * @param options.omitLang — use for admin edit form so `name`/`description` stay full `{ ar, en }` objects.
 */
export async function getDestination(
  id: number,
  options?: { lang?: string; omitLang?: boolean },
): Promise<ApiResponse<Destination>> {
  const res = await apiClient<unknown>(`/destinations/${id}`, {
    method: 'GET',
    ...(options ?? {}),
  });
  if (res.error) {
    return { data: null, error: res.error };
  }
  if (res.data == null) {
    return { data: null, error: 'Unknown error' };
  }
  return { data: normalizeDestination(res.data), error: null };
}

export async function createDestination(
  data: CreateDestinationInput,
): Promise<ApiResponse<Destination>> {
  const res = await apiClient<unknown>('/destinations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (res.error) {
    return { data: null, error: res.error };
  }
  if (res.data == null) {
    return { data: null, error: 'Unknown error' };
  }
  return { data: normalizeDestination(res.data), error: null };
}

export async function updateDestination(
  id: number,
  data: Partial<CreateDestinationInput>,
): Promise<ApiResponse<Destination>> {
  const res = await apiClient<unknown>(`/destinations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (res.error) {
    return { data: null, error: res.error };
  }
  if (res.data == null) {
    return { data: null, error: 'Unknown error' };
  }
  return { data: normalizeDestination(res.data), error: null };
}

export async function deleteDestination(id: number): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>(`/destinations/${id}`, {
    method: 'DELETE',
  });
}
