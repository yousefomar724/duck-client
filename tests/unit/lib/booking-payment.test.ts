import { describe, expect, it } from 'vitest';
import { paymentState, refundOwed, remainingAmount } from '@/lib/bookings/payment';

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
