'use client';

import { apiClient, ApiResponse } from './client';
import type { Booking, BookingStatus, CreateBookingRequest } from '@/lib/types';

export interface BookingResponse {
  payment_url: string;
  booking: Booking;
}

export interface ManualBookingResponse {
  message: string;
  booking: Booking;
}

export async function createManualBooking(
  data: CreateBookingRequest,
): Promise<ApiResponse<ManualBookingResponse>> {
  return apiClient<ManualBookingResponse>('/bookings/manual', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function confirmManualPayment(
  id: string,
  amountPaid?: number,
  note?: string,
): Promise<ApiResponse<{ message: string; booking: Booking }>> {
  return apiClient<{ message: string; booking: Booking }>(
    `/bookings/${id}/manual-confirm`,
    {
      method: 'POST',
      body: JSON.stringify({ amount_paid: amountPaid, note }),
    },
  );
}

export async function refundManualPayment(
  id: string,
): Promise<ApiResponse<{ message: string; booking: Booking }>> {
  return apiClient<{ message: string; booking: Booking }>(
    `/bookings/${id}/manual-refund`,
    { method: 'POST' },
  );
}

export async function collectBalance(
  id: string,
  amount?: number,
  note?: string,
): Promise<ApiResponse<{ message: string; booking: Booking }>> {
  return apiClient<{ message: string; booking: Booking }>(
    `/bookings/${id}/collect-balance`,
    {
      method: 'POST',
      body: JSON.stringify({ amount, note }),
    },
  );
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
  id: string,
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
  id: string,
  reason?: string,
): Promise<ApiResponse<ProcessRefundResponse>> {
  return apiClient<ProcessRefundResponse>(`/bookings/${id}/refund`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? '' }),
  });
}

/** Admin-only: cancel booking (e.g. guest, weather) → REFUND_PENDING or CANCELLED */
export async function adminCancelBooking(
  id: string,
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

export interface UpdateBookingRequest {
  quantity?: number;
  local_guests?: number;
  foreigner_guests?: number;
  duration?: number;
  wants_guide?: boolean;
  resource_type?: 'kayak' | 'water_cycle' | 'sup';
  booking_date?: string;
  full_name?: string;
  phone_number?: string;
  amount_override?: number;
  note?: string;
}

export async function updateBooking(
  id: string,
  data: UpdateBookingRequest,
): Promise<ApiResponse<{ message: string; booking: Booking }>> {
  return apiClient<{ message: string; booking: Booking }>(`/bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function supplierCancelBooking(
  id: string,
  reason?: string,
): Promise<ApiResponse<{ message: string; booking: Booking }>> {
  return apiClient<{ message: string; booking: Booking }>(
    `/bookings/${id}/supplier-cancel`,
    {
      method: 'POST',
      body: JSON.stringify({ reason: reason?.trim() ?? '' }),
    },
  );
}

export async function markRefundSent(
  id: string,
  note?: string,
): Promise<ApiResponse<{ message: string; booking: Booking }>> {
  return apiClient<{ message: string; booking: Booking }>(
    `/bookings/${id}/refund-sent`,
    {
      method: 'POST',
      body: JSON.stringify({ note: note?.trim() ?? '' }),
    },
  );
}

export async function deleteBooking(
  id: string,
): Promise<ApiResponse<{ message: string }>> {
  return apiClient<{ message: string }>(`/bookings/${id}`, {
    method: 'DELETE',
  });
}
