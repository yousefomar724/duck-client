'use client';

import { apiClient, ApiResponse } from './client';
import type { Booking, BookingStatus, CreateBookingRequest } from '@/lib/types';

export interface BookingResponse {
  payment_url: string;
  booking: Booking;
}

export async function createBooking(
  data: CreateBookingRequest,
): Promise<ApiResponse<BookingResponse>> {
  return apiClient<BookingResponse>('/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getBookings(): Promise<ApiResponse<Booking[]>> {
  return apiClient<Booking[]>('/bookings', { method: 'GET' });
}

export async function getMyBookings(): Promise<ApiResponse<Booking[]>> {
  return apiClient<Booking[]>('/bookings/my-bookings', { method: 'GET' });
}

/** Authenticated end-user's own bookings */
export async function getUserBookings(): Promise<ApiResponse<Booking[]>> {
  return apiClient<Booking[]>('/bookings/user', { method: 'GET' });
}

export async function cancelBooking(
  id: number,
): Promise<ApiResponse<{ message: string; booking: Booking }>> {
  return apiClient<{ message: string; booking: Booking }>(
    `/bookings/${id}/cancel`,
    { method: 'POST' },
  );
}

export interface ProcessRefundResponse {
  message: string;
  booking_status: Extract<
    BookingStatus,
    'REFUNDED' | 'REFUND_FAILED'
  >;
  refund: unknown;
}

export async function processRefund(
  id: number,
  reason?: string,
): Promise<ApiResponse<ProcessRefundResponse>> {
  return apiClient<ProcessRefundResponse>(`/bookings/${id}/refund`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? '' }),
  });
}

/** Admin-only: cancel booking (e.g. guest, weather) → REFUND_PENDING; no 24h rule */
export async function adminCancelBooking(
  id: number,
  reason?: string,
): Promise<ApiResponse<{ message: string; booking: Booking }>> {
  return apiClient<{ message: string; booking: Booking }>(
    `/bookings/${id}/admin-cancel`,
    {
      method: 'POST',
      body: JSON.stringify({ reason: reason?.trim() ?? '' }),
    },
  );
}
