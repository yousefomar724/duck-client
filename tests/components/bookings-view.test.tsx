import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { BookingsView } from '@/components/dashboard/bookings/bookings-view';
import { renderWithIntl } from '../utils/render';

vi.mock('@/lib/api/bookings', () => ({
  getBookings: vi.fn(async () => ({ data: [], error: null })),
  getMyBookings: vi.fn(async () => ({ data: [], error: null })),
  adminCancelBooking: vi.fn(),
  processRefund: vi.fn(),
  confirmManualPayment: vi.fn(),
  refundManualPayment: vi.fn(),
}));

vi.mock('@/lib/api/trips', () => ({
  getTrips: vi.fn(async () => ({ data: [], error: null })),
  getMyTrips: vi.fn(async () => ({ data: [], error: null })),
}));

vi.mock('@/lib/api/suppliers', () => ({
  getSuppliers: vi.fn(async () => ({ data: [], error: null })),
}));

describe('BookingsView', () => {
  it('renders empty state for admin', async () => {
    renderWithIntl(<BookingsView role="admin" />);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
