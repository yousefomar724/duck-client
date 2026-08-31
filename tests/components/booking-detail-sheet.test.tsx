import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { BookingDetailSheet } from '@/components/dashboard/bookings/booking-detail-sheet';
import { renderWithIntl } from '../utils/render';

function renderSheet(overrides: Record<string, unknown> = {}) {
  return renderWithIntl(
    <BookingDetailSheet
      booking={
        {
          ID: 'b1',
          status: 'CONFIRMED',
          payment_method: 'MANUAL',
          full_name: 'أحمد',
          phone_number: '+201000000000',
          amount: 360,
          amount_paid: 360,
          quantity: 2,
          local_guests: 2,
          foreigner_guests: 0,
          booking_date: new Date().toISOString(),
          ...overrides,
        } as never
      }
      open
      onOpenChange={vi.fn()}
      role="admin"
      onAction={vi.fn()}
    />,
  );
}

// Both answers are collected by the public booking form and already appear in
// the supplier email; they were missing from the dashboard entirely.
describe('BookingDetailSheet survey answers', () => {
  it('shows the referral channel with its Arabic label', () => {
    renderSheet({ hear_about_us: 'instagram' });
    expect(screen.getByText('كيف عرف عننا')).toBeInTheDocument();
    expect(screen.getByText('إنستغرام')).toBeInTheDocument();
  });

  it('appends the free-text detail for a friend referral', () => {
    renderSheet({ hear_about_us: 'friend', referral_text: 'محمد' });
    expect(screen.getByText('صديق — محمد')).toBeInTheDocument();
  });

  it('shows whether the guest has played before', () => {
    renderSheet({ played_before: true });
    expect(screen.getByText('سبق له التجربة')).toBeInTheDocument();
    expect(screen.getAllByText('نعم').length).toBeGreaterThan(0);
  });

  it('falls back to "غير محدد" when the answers are absent', () => {
    renderSheet();
    expect(screen.getAllByText('غير محدد').length).toBeGreaterThanOrEqual(2);
  });
});
