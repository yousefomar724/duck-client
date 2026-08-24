import { describe, expect, it } from 'vitest';
import {
  matchesStatusGroup,
  canAdminCancelBooking,
  needsAction,
  isOverdueForCompletion,
  effectiveBookingGroup,
  bookingBadgeMeta,
} from '@/lib/bookings/status';

describe('bookings status', () => {
  it('matches status groups', () => {
    expect(matchesStatusGroup('PENDING', 'needsAction')).toBe(true);
    expect(matchesStatusGroup('PENDING', 'completed')).toBe(false);
    expect(matchesStatusGroup('PENDING', 'all')).toBe(true);
  });

  it('detects needs action', () => {
    expect(needsAction({ status: 'PENDING' })).toBe(true);
    expect(needsAction({ status: 'COMPLETED' })).toBe(false);
  });

  it('allows admin cancel for pending and active paid statuses', () => {
    expect(canAdminCancelBooking('PENDING')).toBe(true);
    expect(canAdminCancelBooking('CONFIRMED')).toBe(true);
    expect(canAdminCancelBooking('COMPLETED')).toBe(false);
  });
});

describe('cron-lag correction (isOverdueForCompletion / effectiveBookingGroup / bookingBadgeMeta)', () => {
  const now = new Date('2026-08-24T12:00:00.000Z');
  const yesterday = '2026-08-23T07:00:00.000Z';
  const tomorrow = '2026-08-25T07:00:00.000Z';

  it('flags a CONFIRMED booking whose date has passed as overdue', () => {
    expect(
      isOverdueForCompletion({ status: 'CONFIRMED', booking_date: yesterday }, now),
    ).toBe(true);
  });

  it('does not flag a CONFIRMED booking whose date is still ahead', () => {
    expect(
      isOverdueForCompletion({ status: 'CONFIRMED', booking_date: tomorrow }, now),
    ).toBe(false);
  });

  it('does not flag statuses outside the upcoming group, even if overdue', () => {
    expect(isOverdueForCompletion({ status: 'PENDING', booking_date: yesterday }, now)).toBe(
      false,
    );
    expect(isOverdueForCompletion({ status: 'COMPLETED', booking_date: yesterday }, now)).toBe(
      false,
    );
  });

  it('treats a missing booking_date as not overdue', () => {
    expect(isOverdueForCompletion({ status: 'CONFIRMED', booking_date: undefined }, now)).toBe(
      false,
    );
  });

  it('reclassifies an overdue upcoming booking into the completed group', () => {
    expect(effectiveBookingGroup({ status: 'CONFIRMED', booking_date: yesterday }, now)).toBe(
      'completed',
    );
    expect(effectiveBookingGroup({ status: 'PAID', booking_date: tomorrow }, now)).toBe(
      'upcoming',
    );
  });

  it('leaves other groups untouched', () => {
    expect(effectiveBookingGroup({ status: 'PENDING', booking_date: yesterday }, now)).toBe(
      'needsAction',
    );
    expect(effectiveBookingGroup({ status: 'REFUNDED', booking_date: yesterday }, now)).toBe(
      'cancelled',
    );
  });

  it('shows the COMPLETED badge appearance for an overdue CONFIRMED booking', () => {
    const meta = bookingBadgeMeta({ status: 'CONFIRMED', booking_date: yesterday }, now);
    expect(meta?.shortLabel).toBe('منتهية');
    expect(meta?.group).toBe('completed');
  });

  it('shows the normal CONFIRMED badge appearance while still upcoming', () => {
    const meta = bookingBadgeMeta({ status: 'CONFIRMED', booking_date: tomorrow }, now);
    expect(meta?.shortLabel).toBe('قادم');
  });
});
