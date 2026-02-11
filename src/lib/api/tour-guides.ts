'use client';

import { apiClient, ApiResponse } from './client';
import type { TourGuide } from '@/lib/types';

export interface CreateTourGuideInput {
  name: string;
  price: number;
  phone_number: string;
}

export async function getTourGuides(): Promise<ApiResponse<TourGuide[]>> {
  return apiClient<TourGuide[]>('/tour-guides', { method: 'GET' });
}

export async function getTourGuide(id: number): Promise<ApiResponse<TourGuide>> {
  return apiClient<TourGuide>(`/tour-guides/${id}`, { method: 'GET' });
}

export async function createTourGuide(
  data: CreateTourGuideInput,
): Promise<ApiResponse<TourGuide>> {
  return apiClient<TourGuide>('/tour-guides', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTourGuide(
  id: number,
  data: Partial<CreateTourGuideInput>,
): Promise<ApiResponse<TourGuide>> {
  return apiClient<TourGuide>(`/tour-guides/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTourGuide(id: number): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>(`/tour-guides/${id}`, {
    method: 'DELETE',
  });
}
