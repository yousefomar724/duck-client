'use client';

import { apiClient, type ApiResponse } from './client';
import type { Booking } from '@/lib/types';
import type { DemandBand, HeatLevel } from '@/components/dashboard/ops/heat';
import type { NationalityKind } from '@/components/dashboard/ops/ops-strings';

export interface OpsCapacity {
  total: number;
  per_resource: { type: string; capacity: number; maintenance: number }[];
}

export interface OpsCalendarDay {
  ymd: string;
  bookings: number;
  guests: number;
  units: number;
  revenue: number;
  heat: HeatLevel;
  peak_units?: number;
}

export interface OpsHourRow {
  hour: string;
  bookings: number;
  guests: number;
  units: number;
  capacity: number;
  pct: number;
  band: DemandBand;
}

export interface OpsHourBooking extends Booking {
  payment_state?: string;
  remaining?: number;
  nationality?: NationalityKind;
}

function qs(params: Record<string, string | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) search.set(k, v);
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export async function getOpsCalendar(month: string, supplierId?: string | null, peak = false) {
  return apiClient<{ month: string; capacity: OpsCapacity; days: OpsCalendarDay[] }>(
    `/ops/calendar${qs({ month, supplier_id: supplierId, peak: peak ? '1' : undefined })}`,
  );
}

export async function getOpsDay(date: string, supplierId?: string | null) {
  return apiClient<{
    date: string;
    capacity: OpsCapacity;
    summary: { bookings: number; guests: number; units: number; revenue: number };
    hours: OpsHourRow[];
  }>(`/ops/day${qs({ date, supplier_id: supplierId })}`);
}

export async function getOpsHour(date: string, time: string, supplierId?: string | null) {
  return apiClient<{
    date: string;
    time: string;
    capacity: OpsCapacity;
    units: number;
    pct: number;
    band: DemandBand;
    bookings: OpsHourBooking[];
  }>(`/ops/hour${qs({ date, time, supplier_id: supplierId })}`);
}

export async function getOpsSummary(date?: string, supplierId?: string | null) {
  return apiClient<{
    date: string;
    summary: { bookings: number; guests: number; units: number; revenue: number };
    hours: OpsHourRow[];
    capacity: OpsCapacity;
    next_slot: { hour: string; bookings: number } | null;
    upcoming: number;
    unread_notifications: number;
    top_bookings: Booking[];
  }>(`/ops/summary${qs({ date, supplier_id: supplierId })}`);
}

export async function getOpsAvailability(tripId: string, date: string, resourceType?: string) {
  return apiClient<{
    date: string;
    slots: { time: string; remaining: Record<string, number>; remaining_total: number }[];
  }>(`/ops/availability${qs({ trip_id: tripId, date, resource_type: resourceType })}`);
}

export async function getOpsNotifications(supplierId?: string | null) {
  return apiClient<{
    items: { key: string; type: string; title: string; href: string; read: boolean }[];
  }>(`/ops/notifications${qs({ supplier_id: supplierId })}`);
}

export async function markOpsNotificationsRead(keys?: string[]): Promise<ApiResponse<{ message: string }>> {
  return apiClient('/ops/notifications/read', {
    method: 'POST',
    body: JSON.stringify({ keys }),
  });
}
