import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingsView } from '@/components/dashboard/bookings/bookings-view';
import { renderWithIntl } from '../utils/render';
import type { Booking } from '@/lib/types';

const getMyBookings = vi.fn();
const collectBalance = vi.fn();

vi.mock('@/lib/api/bookings', () => ({
  getBookings: vi.fn(async () => ({ data: [], error: null })),
  getMyBookings: (...args: unknown[]) => getMyBookings(...args),
  adminCancelBooking: vi.fn(),
  processRefund: vi.fn(),
  confirmManualPayment: vi.fn(),
  refundManualPayment: vi.fn(),
  collectBalance: (...args: unknown[]) => collectBalance(...args),
  supplierCancelBooking: vi.fn(),
  markRefundSent: vi.fn(),
  deleteBooking: vi.fn(),
  updateBooking: vi.fn(),
}));

vi.mock('@/lib/api/trips', () => ({
  getTrips: vi.fn(async () => ({ data: [], error: null })),
  getMyTrips: vi.fn(async () => ({ data: [], error: null })),
  updateTrip: vi.fn(),
}));

vi.mock('@/lib/api/suppliers', () => ({
  getSuppliers: vi.fn(async () => ({ data: [], error: null })),
}));

vi.mock('@/lib/api/tour-guides', () => ({
  getTourGuides: vi.fn(async () => ({ data: [], error: null })),
}));

function baseBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    ID: 'b1',
    session_id: '',
    user_id: '',
    trip_id: 't1',
    supplier_id: 's1',
    amount: 200,
    currency: 'EGP',
    full_name: 'Jane Doe',
    phone_number: '+201000000000',
    status: 'COMPLETED',
    payment_method: 'MANUAL',
    booking_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    quantity: 1,
    amount_paid: 100,
    refund_owed: 0,
    ...overrides,
  } as Booking;
}

describe('BookingsView', () => {
  it('renders empty state for admin', async () => {
    getMyBookings.mockResolvedValue({ data: [], error: null });
    renderWithIntl(<BookingsView role="admin" />);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it(
    'resyncs the table and detail sheet after collecting a balance, even when the first attempt fails',
    async () => {
    const user = userEvent.setup();
    const pending = baseBooking();
    const settled = baseBooking({ amount_paid: 200 });

    getMyBookings
      .mockResolvedValueOnce({ data: [pending], error: null })
      .mockResolvedValueOnce({ data: [pending], error: null })
      .mockResolvedValueOnce({ data: [settled], error: null });
    collectBalance
      .mockResolvedValueOnce({ data: null, error: 'wallet not found' })
      .mockResolvedValueOnce({ data: { booking: settled }, error: null });

    renderWithIntl(<BookingsView role="supplier" />);

    await screen.findAllByText('Jane Doe');
    // Open the detail sheet.
    await user.click(screen.getAllByText('Jane Doe')[0]);

    const collectButtons = await screen.findAllByRole('button', {
      name: /تحصيل المتبقي/,
    });
    await user.click(collectButtons[0]);

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /تحصيل المتبقي/ }));

    // First attempt fails — the list still refetches (finally-block behaviour).
    await vi.waitFor(() => expect(getMyBookings).toHaveBeenCalledTimes(2));

    // Retry and succeed.
    const collectButtonsAgain = await screen.findAllByRole('button', {
      name: /تحصيل المتبقي/,
    });
    await user.click(collectButtonsAgain[0]);
    const dialogAgain = await screen.findByRole('alertdialog');
    await user.click(within(dialogAgain).getByRole('button', { name: /تحصيل المتبقي/ }));

    await vi.waitFor(() => expect(getMyBookings).toHaveBeenCalledTimes(3));

    // The detail sheet — still open on the same booking — reflects the refetched amount.
    await vi.waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /تحصيل المتبقي/ }),
      ).not.toBeInTheDocument();
    });
    },
    15_000,
  );
});
