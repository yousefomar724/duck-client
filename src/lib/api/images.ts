'use client';

import { apiClient, uploadFile, ApiResponse } from './client';
import { compressImageFile, MAX_UPLOAD_BYTES } from '@/lib/image-compression';
import type { ImageStorage } from '@/lib/types';

const TOO_LARGE_MESSAGE = 'الصورة أكبر من 10 ميجابايت. اختر صورة أصغر.';

/**
 * Every upload goes through here so the browser-side shrink is never skipped
 * — the raw file from a phone camera is far too big for the serverless
 * request-body cap. The 10MB check is on the *original*, matching the limit
 * the server enforces.
 */
async function uploadCompressed(
  endpoint: string,
  file: File,
): Promise<ApiResponse<ImageStorage>> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { data: null, error: TOO_LARGE_MESSAGE };
  }
  return uploadFile<ImageStorage>(endpoint, await compressImageFile(file));
}

export async function uploadImage(file: File): Promise<ApiResponse<ImageStorage>> {
  return uploadCompressed('/images', file);
}

export async function uploadImageForAdmin(file: File): Promise<ApiResponse<ImageStorage>> {
  return uploadCompressed('/admin/images', file);
}

export async function getImages(): Promise<ApiResponse<ImageStorage[]>> {
  return apiClient<ImageStorage[]>('/images', { method: 'GET' });
}

export async function getImage(id: string): Promise<ApiResponse<ImageStorage>> {
  return apiClient<ImageStorage>(`/images/${id}`, { method: 'GET' });
}

export async function deleteImage(id: string): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>(`/images/${id}`, {
    method: 'DELETE',
  });
}
