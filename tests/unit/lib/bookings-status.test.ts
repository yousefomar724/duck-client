import { describe, expect, it } from 'vitest';
import {
  matchesStatusGroup,
  canAdminCancelBooking,
  needsAction,
} from '@/lib/bookings/status';

describe('bookings status', () => {
  it('matches status groups', () => {
    expect(matchesStatusGroup('PENDING', 'needsAction')).toBe(true);
    expect(matchesStatusGroup('PENDING', 'done')).toBe(false);
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
