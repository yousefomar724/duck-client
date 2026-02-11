'use client';

import { apiClient, ApiResponse } from './client';
import type { Booking, CreateBookingRequest } from '@/lib/types';

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
