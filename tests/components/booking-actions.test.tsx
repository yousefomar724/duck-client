import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingActions } from '@/components/dashboard/bookings/booking-actions';
import { renderWithIntl } from '../utils/render';

describe('BookingActions', () => {
  it('shows admin cancel for confirmed booking', async () => {
    const onAction = vi.fn();
    renderWithIntl(
      <BookingActions
        booking={{
          ID: 'b1',
          status: 'CONFIRMED',
          payment_method: 'MANUAL',
        } as never}
        role="admin"
        onAction={onAction}
      />,
    );
    expect(screen.getByRole('button', { name: /إلغاء من الإدارة/ })).toBeInTheDocument();
  });

  it('hides actions for supplier on a completed booking', () => {
    const { container } = renderWithIntl(
      <BookingActions
        booking={{ ID: 'b1', status: 'COMPLETED', payment_method: 'MANUAL' } as never}
        role="supplier"
        onAction={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
