import { describe, expect, it } from 'vitest';
import {
  canDeleteBooking,
  canEditBooking,
  canSupplierCancelBooking,
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

  it('allows delete only on terminal statuses', () => {
    expect(canDeleteBooking('CANCELLED')).toBe(true);
    expect(canDeleteBooking('REFUNDED')).toBe(true);
    expect(canDeleteBooking('FAILED')).toBe(true);
    expect(canDeleteBooking('CONFIRMED')).toBe(false);
  });
});
