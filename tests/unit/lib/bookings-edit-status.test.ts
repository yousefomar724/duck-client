import { describe, expect, it } from 'vitest';
import {
  canAdminDeleteBooking,
  canEditBooking,
  canSupplierCancelBooking,
  deleteNeedsStrongConfirm,
  isUpcoming,
  matchesStatusGroup,
} from '@/lib/bookings/status';

describe('booking action guards', () => {
  it('allows edit on pending and confirmed only', () => {
    expect(canEditBooking('PENDING')).toBe(true);
    expect(canEditBooking('CONFIRMED')).toBe(true);
    expect(canEditBooking('COMPLETED')).toBe(false);
  });

  it('allows supplier cancel on pending and confirmed', () => {
    expect(canSupplierCancelBooking('PENDING')).toBe(true);
    expect(canSupplierCancelBooking('CONFIRMED')).toBe(true);
    expect(canSupplierCancelBooking('REFUNDED')).toBe(false);
  });

  it('allows admin delete by role, not by status', () => {
    expect(canAdminDeleteBooking(2)).toBe(true);
    expect(canAdminDeleteBooking('admin')).toBe(true);
    expect(canAdminDeleteBooking(1)).toBe(false);
    expect(deleteNeedsStrongConfirm('CONFIRMED')).toBe(true);
    expect(deleteNeedsStrongConfirm('CANCELLED')).toBe(false);
  });

  it('groups confirmed as upcoming and completed separately', () => {
    expect(matchesStatusGroup('CONFIRMED', 'upcoming')).toBe(true);
    expect(matchesStatusGroup('COMPLETED', 'completed')).toBe(true);
    expect(matchesStatusGroup('REFUNDED', 'cancelled')).toBe(true);
  });

  it('treats a past confirmed booking as not upcoming', () => {
    expect(
      isUpcoming(
        { status: 'CONFIRMED', booking_date: '2020-01-01T10:00:00Z' },
        new Date('2026-01-01T00:00:00Z'),
      ),
    ).toBe(false);
    expect(
      isUpcoming(
        { status: 'CONFIRMED', booking_date: '2026-08-01T10:00:00Z' },
        new Date('2026-01-01T00:00:00Z'),
      ),
    ).toBe(true);
  });
});
