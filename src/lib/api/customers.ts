'use client';

import { apiClient } from './client';

export async function getCustomers(q = '', page = 1, supplierId?: string | null) {
  const search = new URLSearchParams({ q, page: String(page) });
  if (supplierId) search.set('supplier_id', supplierId);
  return apiClient<{
    items: { phone_number: string; name: string; bookings: number; last_visit: string; total: number }[];
    total: number;
    page: number;
    limit: number;
  }>(`/customers?${search.toString()}`);
}
