import { describe, expect, it } from 'vitest';
import { outstandingBalance, paymentState, refundOwed, remainingAmount } from '@/lib/bookings/payment';

describe('payment state with refund owed', () => {
  it('returns REFUND_OWED when refund_owed is positive', () => {
    expect(
      paymentState({ amount: 360, amount_paid: 540, refund_owed: 180 }),
    ).toBe('REFUND_OWED');
  });

  it('returns PAID when fully paid with no refund owed', () => {
    expect(paymentState({ amount: 540, amount_paid: 540, refund_owed: 0 })).toBe('PAID');
  });

  it('computes remaining after downward edit', () => {
    expect(remainingAmount({ amount: 360, amount_paid: 540 })).toBe(0);
    expect(refundOwed({ refund_owed: 180 })).toBe(180);
  });
});

describe('outstandingBalance', () => {
  it('is 0 for REFUNDED even if amount_paid was not reset', () => {
    expect(
      outstandingBalance({ status: 'REFUNDED', amount: 300, amount_paid: 0 }),
    ).toBe(0);
  });

  it('is 0 for CANCELLED, FAILED, REFUND_PENDING and REFUND_FAILED', () => {
    for (const status of ['CANCELLED', 'FAILED', 'REFUND_PENDING', 'REFUND_FAILED'] as const) {
      expect(outstandingBalance({ status, amount: 300, amount_paid: 0 })).toBe(0);
    }
  });

  it('is the full amount for PENDING (nothing paid yet)', () => {
    expect(
      outstandingBalance({ status: 'PENDING', amount: 300, amount_paid: 0 }),
    ).toBe(300);
  });

  it('is the paid/total delta for a partially-paid CONFIRMED booking', () => {
    expect(
      outstandingBalance({ status: 'CONFIRMED', amount: 300, amount_paid: 120 }),
    ).toBe(180);
  });

  it('is 0 for a fully-paid COMPLETED booking', () => {
    expect(
      outstandingBalance({ status: 'COMPLETED', amount: 300, amount_paid: 300 }),
    ).toBe(0);
  });
});
