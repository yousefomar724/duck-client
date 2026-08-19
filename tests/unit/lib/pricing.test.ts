import { describe, expect, it } from 'vitest';
import {
  calculateBookingBreakdown,
  calculateBookingTotal,
  minimumDeposit,
} from '@/lib/booking/pricing';

const trip = {
  price: 180,
  foreigner_price: 500,
  is_tour: false,
};

describe('pricing', () => {
  it('calculates local guest total', () => {
    expect(
      calculateBookingTotal({
        trip,
        guestMix: 'local',
        guests: 2,
        localGuests: 0,
        foreignerGuests: 0,
        duration: 1,
      }),
    ).toBe(360);
  });

  it('calculates mixed guest total', () => {
    expect(
      calculateBookingTotal({
        trip,
        guestMix: 'mixed',
        guests: 3,
        localGuests: 2,
        foreignerGuests: 1,
        duration: 1,
      }),
    ).toBe(860);
  });

  it('returns 0 without trip', () => {
    expect(
      calculateBookingTotal({
        trip: null,
        guestMix: 'local',
        guests: 1,
        localGuests: 0,
        foreignerGuests: 0,
        duration: 1,
      }),
    ).toBe(0);
  });

  it('computes minimum deposit', () => {
    expect(minimumDeposit(181)).toBe(91);
    expect(minimumDeposit(100)).toBe(50);
  });

  it('adds kids to local guest count', () => {
    expect(
      calculateBookingTotal({
        trip,
        guestMix: 'local',
        guests: 2,
        localGuests: 0,
        foreignerGuests: 0,
        duration: 1,
        kids1to6: 1,
        kids7to12: 1,
      }),
    ).toBe(720);
  });

  it('omits kids without changing existing totals', () => {
    expect(
      calculateBookingBreakdown({
        trip,
        guestMix: 'mixed',
        guests: 3,
        localGuests: 2,
        foreignerGuests: 1,
        duration: 1,
      }),
    ).toEqual({
      localCount: 2,
      foreignerCount: 1,
      duration: 1,
      localTotal: 360,
      foreignerTotal: 500,
      total: 860,
    });
  });
});
