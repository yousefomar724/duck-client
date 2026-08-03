import { describe, expect, it } from 'vitest';
import { computeBookingAmount } from '@/server/services/booking';

const baseTrip = {
  is_tour: false,
  price: 180,
  foreigner_price: 500,
  guide_price: 50,
  guide_mandatory: false,
};

describe('computeBookingAmount', () => {
  it('calculates simple quantity pricing', () => {
    const result = computeBookingAmount(baseTrip, { quantity: 2 });
    expect(result).toEqual({
      amount: 360,
      quantity: 2,
      localGuests: 0,
      foreignerGuests: 0,
    });
  });

  it('calculates mixed guest pricing', () => {
    const result = computeBookingAmount(baseTrip, {
      local_guests: 2,
      foreigner_guests: 1,
    });
    expect(result.amount).toBe(860);
    expect(result.quantity).toBe(3);
  });

  it('applies tour duration multiplier', () => {
    const result = computeBookingAmount(
      { ...baseTrip, is_tour: true },
      { local_guests: 2, duration: 3 },
    );
    expect(result.amount).toBe(1080);
  });

  it('adds guide price when wanted or mandatory', () => {
    expect(
      computeBookingAmount(baseTrip, { quantity: 1, wants_guide: true }).amount,
    ).toBe(230);
    expect(
      computeBookingAmount(
        { ...baseTrip, guide_mandatory: true },
        { quantity: 1 },
      ).amount,
    ).toBe(230);
  });
});
