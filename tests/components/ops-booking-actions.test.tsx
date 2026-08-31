import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpsHourPanel } from '@/components/dashboard/ops/ops-hour-panel';

const deleteBooking = vi.fn().mockResolvedValue({ data: {}, error: null });

vi.mock('@/lib/api/bookings', () => ({
  deleteBooking: (...args: unknown[]) => deleteBooking(...args),
  adminCancelBooking: vi.fn().mockResolvedValue({ error: null }),
  processRefund: vi.fn().mockResolvedValue({ data: {}, error: null }),
  confirmManualPayment: vi.fn().mockResolvedValue({ error: null }),
  refundManualPayment: vi.fn().mockResolvedValue({ error: null }),
  collectBalance: vi.fn().mockResolvedValue({ error: null }),
  supplierCancelBooking: vi.fn().mockResolvedValue({ error: null }),
  markRefundSent: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('@/lib/api/trips', () => ({
  getTrips: vi.fn().mockResolvedValue({ data: [] }),
  getMyTrips: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('@/lib/stores/toast-store', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

const booking = {
  ID: 'b1',
  status: 'CANCELLED',
  payment_method: 'MANUAL',
  full_name: 'أحمد',
  phone_number: '+201000000000',
  amount: 360,
  amount_paid: 0,
  quantity: 1,
  booking_date: new Date().toISOString(),
};

function renderPanel() {
  return render(
    <OpsHourPanel
      role="admin"
      date="2026-09-02"
      time="09:00"
      bookings={[booking] as never}
      units={1}
      capacity={10}
      pct={10}
      band="available"
      onReload={vi.fn()}
      onUpdated={vi.fn()}
    />,
  );
}

describe('ops calendar booking actions', () => {
  beforeEach(() => deleteBooking.mockClear());

  // Regression: the hour panel passed `onAction={() => onReload()}`, so the
  // delete button existed in the calendar's detail sheet but did nothing.
  it('calls the delete API when deleting from the calendar detail sheet', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByText('أحمد'));

    const triggers = await screen.findAllByRole('button', { name: /حذف الحجز/ });
    await user.click(triggers[0]);

    // the dialog's confirm action reuses the same label as the trigger, so the
    // newly rendered one is the last in the tree
    // the confirm dialog replaces the trigger, so re-query once it is open
    await screen.findByRole('button', { name: 'إلغاء' });
    await user.click(screen.getByRole('button', { name: /حذف الحجز/ }));

    await waitFor(() => expect(deleteBooking).toHaveBeenCalled());
    expect(deleteBooking.mock.calls[0][0]).toBe('b1');
  });
});
