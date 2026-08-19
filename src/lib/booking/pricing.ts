import type { Trip } from '@/lib/types';

export type GuestMix = 'local' | 'foreigner' | 'mixed';

export interface BookingTotalInput {
  trip: Pick<Trip, 'price' | 'foreigner_price' | 'is_tour'> | null;
  guestMix: GuestMix;
  guests: number;
  localGuests: number;
  foreignerGuests: number;
  duration: number;
  kids1to6?: number;
  kids7to12?: number;
}

export interface BookingBreakdown {
  localCount: number;
  foreignerCount: number;
  duration: number;
  localTotal: number;
  foreignerTotal: number;
  total: number;
}

export function calculateBookingBreakdown({
  trip,
  guestMix,
  guests,
  localGuests,
  foreignerGuests,
  duration,
  kids1to6 = 0,
  kids7to12 = 0,
}: BookingTotalInput): BookingBreakdown {
  if (!trip) {
    return {
      localCount: 0,
      foreignerCount: 0,
      duration: 1,
      localTotal: 0,
      foreignerTotal: 0,
      total: 0,
    };
  }

  const kids = (Number(kids1to6) || 0) + (Number(kids7to12) || 0);
  const effectiveGuests = (Number(guests) || 0) + kids;
  const localCount =
    guestMix === 'local'
      ? effectiveGuests
      : guestMix === 'mixed'
        ? Number(localGuests) || 0
        : 0;
  const foreignerCount =
    guestMix === 'foreigner'
      ? effectiveGuests
      : guestMix === 'mixed'
        ? Number(foreignerGuests) || 0
        : 0;
  const tripDuration = trip.is_tour ? Number(duration) || 1 : 1;
  const localTotal = trip.price * localCount * tripDuration;
  const foreignerTotal = (trip.foreigner_price ?? 0) * foreignerCount * tripDuration;
  return {
    localCount,
    foreignerCount,
    duration: tripDuration,
    localTotal,
    foreignerTotal,
    total: localTotal + foreignerTotal,
  };
}

export function calculateBookingTotal(input: BookingTotalInput): number {
  return calculateBookingBreakdown(input).total;
}

export function minimumDeposit(total: number): number {
  return Math.ceil(total * 0.5);
}
