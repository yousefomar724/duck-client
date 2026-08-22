import { describe, expect, it } from 'vitest';
import { computeBookingStats, refundDue } from '@/lib/bookings/stats';
import type { Booking, BookingStatus } from '@/lib/types';

function booking(
  status: BookingStatus,
  amount: number,
  amount_paid = 0,
  refund_owed = 0,
): Pick<Booking, 'status' | 'amount' | 'amount_paid' | 'refund_owed'> {
  return { status, amount, amount_paid, refund_owed };
}

describe('refundDue', () => {
  it('uses refund_owed on live bookings', () => {
    expect(refundDue(booking('CONFIRMED', 360, 540, 180))).toBe(180);
  });

  it('uses max(amount_paid, refund_owed) on REFUND_PENDING', () => {
    expect(refundDue(booking('REFUND_PENDING', 360, 540, 0))).toBe(540);
    expect(refundDue(booking('REFUND_PENDING', 360, 540, 180))).toBe(540);
  });
});

describe('computeBookingStats', () => {
  it('counts one fixture per status and splits groups', () => {
    const bookings = [
      booking('PENDING', 100),
      booking('CONFIRMED', 200, 50),
      booking('PAID', 300, 300),
      booking('SUCCESS', 400, 400),
      booking('COMPLETED', 500, 500),
      booking('CANCELLED', 60),
      booking('FAILED', 70),
      booking('REFUNDED', 80, 80),
      booking('REFUND_PENDING', 90, 90),
      booking('REFUND_FAILED', 40, 40),
    ];
    const stats = computeBookingStats(bookings);
    expect(stats.total).toBe(10);
    expect(stats.upcoming).toBe(3);
    expect(stats.completed).toBe(1);
    expect(stats.cancelled).toBe(3);
    expect(stats.needsAction).toBe(3);
    expect(stats.bookedRevenue).toBe(200 + 300 + 400 + 500);
    expect(stats.pipeline).toBe(100);
    expect(stats.grossCollected).toBe(50 + 300 + 400 + 500 + 90 + 40);
    expect(stats.outstanding).toBe(150);
    expect(stats.totalValue).toBe(100 + 200 + 300 + 400 + 500 + 90 + 40);
  });

  it('counts remaining on a partially-paid CONFIRMED booking', () => {
    const stats = computeBookingStats([booking('CONFIRMED', 400, 150)]);
    expect(stats.outstanding).toBe(250);
    expect(stats.bookedRevenue).toBe(400);
    expect(stats.netCollected).toBe(150);
  });

  it('treats REFUND_PENDING with amount_paid and no refund_owed as a full refund due', () => {
    const stats = computeBookingStats([booking('REFUND_PENDING', 360, 360, 0)]);
    expect(stats.grossCollected).toBe(360);
    expect(stats.refundDueTotal).toBe(360);
    expect(stats.netCollected).toBe(0);
    expect(stats.bookedRevenue).toBe(0);
  });

  it('deducts refund_owed on a downward-edited CONFIRMED booking', () => {
    const stats = computeBookingStats([booking('CONFIRMED', 360, 540, 180)]);
    expect(stats.bookedRevenue).toBe(360);
    expect(stats.grossCollected).toBe(540);
    expect(stats.refundDueTotal).toBe(180);
    expect(stats.netCollected).toBe(360);
    expect(stats.outstanding).toBe(0);
  });

  it('does not double-count an edited-then-cancelled booking', () => {
    const stats = computeBookingStats([booking('REFUND_PENDING', 360, 540, 180)]);
    expect(stats.grossCollected).toBe(540);
    expect(stats.refundDueTotal).toBe(540);
    expect(stats.netCollected).toBe(0);
  });

  it('excludes REFUNDED amount_paid from gross collected', () => {
    const stats = computeBookingStats([booking('REFUNDED', 200, 200, 0)]);
    expect(stats.grossCollected).toBe(0);
    expect(stats.netCollected).toBe(0);
  });

  it('totalValue excludes cancelled/failed/refunded but includes pending and refund-in-progress', () => {
    const stats = computeBookingStats([
      booking('PENDING', 100),
      booking('CONFIRMED', 200),
      booking('CANCELLED', 60),
      booking('FAILED', 70),
      booking('REFUNDED', 80, 80),
      booking('REFUND_PENDING', 90, 90),
      booking('REFUND_FAILED', 40, 40),
    ]);
    expect(stats.totalValue).toBe(100 + 200 + 90 + 40);
  });
});
