'use client';

import { apiClient } from './client';

export async function getReportsOverview(from: string, to: string, supplierId?: string | null) {
  const search = new URLSearchParams({ from, to });
  if (supplierId) search.set('supplier_id', supplierId);
  return apiClient<{
    from: string;
    to: string;
    by_day: { _id: string; bookings: number; revenue: number }[];
    popular_activities: { trip_id: string; name: unknown; bookings: number; units: number }[];
    peak_hours: { _id: string; units: number }[];
    nationality: { local: number; foreign: number };
    cancellations: { _id: string; count: number }[];
    sources: { _id: string; count: number }[];
    discount_totals?: {
      gross: number;
      supplier_funded_discounts: number;
      platform_funded_discounts: number;
      platform_discount_credited: number;
      customer_revenue: number;
      supplier_earnings: number;
    };
    discount_codes?: {
      code: string;
      funded_by: string;
      uses: number;
      discount_given: number;
      revenue: number;
    }[];
  }>(`/reports/overview?${search.toString()}`);
}
