import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingScheduleField } from '@/components/booking/booking-schedule-field';
import { renderWithIntl } from '../utils/render';

describe('BookingScheduleField', () => {
  it('renders time slots within bookable window', () => {
    const onChange = vi.fn();
    const value = new Date('2026-08-10T10:00:00');
    renderWithIntl(
      <BookingScheduleField value={value} onChange={onChange} locale="en" />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows an equipment-level notice without disabling every hour at zero capacity', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <BookingScheduleField
        value={new Date('2026-08-10T10:00:00')}
        onChange={vi.fn()}
        locale="en"
        resourceType="kayak"
        availability={{
          date: '2026-08-10',
          capacity: { kayak: 0 },
          capacity_total: 0,
          slots: [{ time: '10:00', remaining: { kayak: 0 }, remaining_total: 0 }],
        }}
      />,
    );
    expect(screen.getByText('This equipment type is not currently offered')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: /10:00/i })).not.toHaveAttribute('data-disabled');
    expect(screen.queryByText(/مكتمل/)).not.toBeInTheDocument();
  });

  it('uses localized sold-out copy when positive capacity is exhausted', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <BookingScheduleField
        value={new Date('2026-08-10T10:00:00')}
        onChange={vi.fn()}
        locale="en"
        resourceType="kayak"
        availability={{
          date: '2026-08-10',
          capacity: { kayak: 4 },
          capacity_total: 4,
          slots: [{ time: '10:00', remaining: { kayak: 0 }, remaining_total: 0 }],
        }}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    const option = screen.getByRole('option', { name: /10:00/i });
    expect(option).toHaveTextContent(/No spaces left/);
    expect(option).toHaveAttribute('data-disabled');
    expect(screen.queryByText(/مكتمل/)).not.toBeInTheDocument();
  });
});
