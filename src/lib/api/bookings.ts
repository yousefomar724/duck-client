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

export async function getBookings(params?: {
  supplier_id?: string
  status?: string
  from?: string
  to?: string
}): Promise<ApiResponse<Booking[]>> {
  const search = new URLSearchParams()
  if (params?.supplier_id) search.set('supplier_id', params.supplier_id)
  if (params?.status) search.set('status', params.status)
  if (params?.from) search.set('from', params.from)
  if (params?.to) search.set('to', params.to)
  const qs = search.toString()
  return apiClient<Booking[]>(`/bookings${qs ? `?${qs}` : ''}`, { method: 'GET' })
}

export async function getBookingsPage(params: {
  page: number
  limit?: number
  supplier_id?: string
  status?: string
  from?: string
  to?: string
  q?: string
  resource_type?: string
  sort?: string
}): Promise<ApiResponse<{ items: Booking[]; total: number; page: number; limit: number }>> {
  const search = new URLSearchParams()
  search.set('page', String(params.page))
  if (params.limit != null) search.set('limit', String(params.limit))
  if (params.supplier_id) search.set('supplier_id', params.supplier_id)
  if (params.status) search.set('status', params.status)
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  if (params.q) search.set('q', params.q)
  if (params.resource_type) search.set('resource_type', params.resource_type)
  if (params.sort) search.set('sort', params.sort)
  return apiClient(`/bookings?${search.toString()}`, { method: 'GET' })
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
  adults?: number;
  kids_1_6?: number;
  kids_7_12?: number;
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

export async function updateBookingStatus(
  id: string,
  status: 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW',
): Promise<ApiResponse<{ message: string; booking: Booking }>> {
  return apiClient<{ message: string; booking: Booking }>(`/bookings/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function deleteBooking(
  id: string,
  reason?: string,
): Promise<ApiResponse<{ message: string; wallet_adjustment?: number }>> {
  return apiClient<{ message: string; wallet_adjustment?: number }>(
    `/bookings/${id}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ reason: reason?.trim() ?? '' }),
    },
  );
}
