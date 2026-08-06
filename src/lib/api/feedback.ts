'use client';

import { apiClient, ApiResponse } from './client';
import type { Feedback, FeedbackContext, FeedbackStatus } from '@/lib/types';

export interface CreateFeedbackInput {
  rating: number;
  comment?: string;
  name?: string;
  contact?: string;
  context?: FeedbackContext;
  booking_ref?: string;
  page?: string;
  locale?: string;
}

export async function createFeedback(
  data: CreateFeedbackInput,
): Promise<ApiResponse<Feedback>> {
  return apiClient<Feedback>('/feedback', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getFeedback(
  status?: FeedbackStatus,
): Promise<ApiResponse<Feedback[]>> {
  const query = status ? `?status=${status}` : '';
  return apiClient<Feedback[]>(`/feedback${query}`, { method: 'GET' });
}

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>(`/feedback/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteFeedback(
  id: string,
): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>(`/feedback/${id}`, {
    method: 'DELETE',
  });
}
