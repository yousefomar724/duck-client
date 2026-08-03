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
});
