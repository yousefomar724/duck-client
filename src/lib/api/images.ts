'use client';

import { apiClient, uploadFile, ApiResponse } from './client';
import type { ImageStorage } from '@/lib/types';

export async function uploadImage(file: File): Promise<ApiResponse<ImageStorage>> {
  return uploadFile<ImageStorage>('/images', file);
}

export async function uploadImageForAdmin(file: File): Promise<ApiResponse<ImageStorage>> {
  return uploadFile<ImageStorage>('/admin/images', file);
}

export async function getImages(): Promise<ApiResponse<ImageStorage[]>> {
  return apiClient<ImageStorage[]>('/images', { method: 'GET' });
}

export async function getImage(id: number): Promise<ApiResponse<ImageStorage>> {
  return apiClient<ImageStorage>(`/images/${id}`, { method: 'GET' });
}

export async function deleteImage(id: number): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>(`/images/${id}`, {
    method: 'DELETE',
  });
}
