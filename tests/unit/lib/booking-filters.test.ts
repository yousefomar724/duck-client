import { describe, expect, it } from 'vitest';
import {
  parseFilters,
  filtersToParams,
  matchesDatePreset,
  matchesDateFilter,
  filterBookingsList,
  bookingsToCsv,
} from '@/components/dashboard/bookings/use-booking-filters';

describe('booking filters', () => {
  it('parses URL params', () => {
    const params = new URLSearchParams('q=test&group=needsAction&status=PENDING');
    expect(parseFilters(params)).toMatchObject({
      search: 'test',
      statusGroup: 'needsAction',
      status: 'PENDING',
    });
  });

  it('serializes filters to params', () => {
    const params = filtersToParams({
      search: 'abc',
      statusGroup: 'all',
      status: 'all',
      paymentMethod: 'all',
      paymentState: 'all',
      supplierId: 'all',
      tripType: 'all',
      datePreset: 'today',
      dateFrom: '',
      dateTo: '',
    });
    expect(params.get('q')).toBe('abc');
    expect(params.get('date')).toBe('today');
  });

  it('matches date presets', () => {
    const today = new Date().toISOString();
    expect(matchesDatePreset(today, 'today')).toBe(true);
    expect(matchesDatePreset(today, 'all')).toBe(true);
  });

  it('parses an explicit date range and ignores the preset', () => {
    const params = new URLSearchParams('from=2026-03-01&to=2026-03-10&date=today');
    expect(parseFilters(params)).toMatchObject({
      dateFrom: '2026-03-01',
      dateTo: '2026-03-10',
      datePreset: 'all',
    });
  });

  it('prefers an explicit date range over a preset', () => {
    expect(
      matchesDateFilter('2026-03-10T08:00:00Z', {
        datePreset: 'today',
        dateFrom: '2026-03-10',
        dateTo: '2026-03-10',
      }),
    ).toBe(true);
    expect(
      matchesDateFilter('2026-03-11T08:00:00Z', {
        datePreset: 'today',
        dateFrom: '2026-03-10',
        dateTo: '2026-03-10',
      }),
    ).toBe(false);
  });

  it('parses from/to query params and ignores a conflicting preset', () => {
    const params = new URLSearchParams('from=2026-03-01&to=2026-03-15&date=week');
    const filters = parseFilters(params);
    expect(filters.dateFrom).toBe('2026-03-01');
    expect(filters.dateTo).toBe('2026-03-15');
    expect(filters.datePreset).toBe('all');
  });

  it('filters bookings by status', () => {
    const bookings = [
      { id: '1', status: 'PENDING', supplier_id: 's1', trip_id: 't1' },
      { id: '2', status: 'COMPLETED', supplier_id: 's1', trip_id: 't1' },
    ] as never[];
    const filtered = filterBookingsList(
      bookings,
      {
        search: '',
        statusGroup: 'all',
        status: 'PENDING',
        paymentMethod: 'all',
        paymentState: 'all',
        supplierId: 'all',
        tripType: 'all',
        datePreset: 'all',
        dateFrom: '',
        dateTo: '',
      },
      [],
      [],
    );
    expect(filtered).toHaveLength(1);
  });

  it('builds csv content', () => {
    const csv = bookingsToCsv([
      {
        ID: 'b1',
        full_name: 'Guest',
        phone_number: '010',
        trip: { name: { en: 'Trip' } },
        booking_date: '2026-08-03',
        amount: 100,
        currency: 'EGP',
        status: 'PENDING',
        payment_method: 'MANUAL',
        quantity: 1,
      } as never,
    ]);
    expect(csv).toContain('Guest');
    expect(csv).toContain('b1');
  });
});
