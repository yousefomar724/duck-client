import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import StatusBadge from '@/components/shared/status-badge';
import { renderWithIntl } from '../utils/render';

describe('StatusBadge (booking)', () => {
  it('shows "قادم" for a CONFIRMED booking whose date is still ahead', () => {
    renderWithIntl(
      <StatusBadge
        status="CONFIRMED"
        type="booking"
        short
        bookingDate="2999-01-01T00:00:00.000Z"
      />,
    );
    expect(screen.getByText('قادم')).toBeInTheDocument();
  });

  it('shows "منتهية" (not "قادم") for a CONFIRMED booking whose date has already passed', () => {
    renderWithIntl(
      <StatusBadge
        status="CONFIRMED"
        type="booking"
        short
        bookingDate="2020-01-01T00:00:00.000Z"
      />,
    );
    expect(screen.getByText('منتهية')).toBeInTheDocument();
    expect(screen.queryByText('قادم')).not.toBeInTheDocument();
  });

  it('falls back to the plain status label when no bookingDate is supplied', () => {
    renderWithIntl(<StatusBadge status="CONFIRMED" type="booking" short />);
    expect(screen.getByText('قادم')).toBeInTheDocument();
  });

  it('does not reclassify a PENDING booking even with a past date', () => {
    renderWithIntl(
      <StatusBadge
        status="PENDING"
        type="booking"
        short
        bookingDate="2020-01-01T00:00:00.000Z"
      />,
    );
    expect(screen.getByText('انتظار')).toBeInTheDocument();
  });
});
