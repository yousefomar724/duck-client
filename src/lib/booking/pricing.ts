import type { Trip } from '@/lib/types';

export type GuestMix = 'local' | 'foreigner' | 'mixed';

export interface BookingTotalInput {
  trip: Pick<Trip, 'price' | 'foreigner_price' | 'is_tour'> | null;
  guestMix: GuestMix;
  guests: number;
  localGuests: number;
  foreignerGuests: number;
  duration: number;
}

export function calculateBookingTotal({
  trip,
  guestMix,
  guests,
  localGuests,
  foreignerGuests,
  duration,
}: BookingTotalInput): number {
  if (!trip) return 0;

  const localCount =
    guestMix === 'local'
      ? Number(guests) || 0
      : guestMix === 'mixed'
        ? Number(localGuests) || 0
        : 0;
  const foreignerCount =
    guestMix === 'foreigner'
      ? Number(guests) || 0
      : guestMix === 'mixed'
        ? Number(foreignerGuests) || 0
        : 0;
  const tripDuration = trip.is_tour ? Number(duration) || 1 : 1;
  const localTotal = trip.price * localCount * tripDuration;
  const foreignerTotal = (trip.foreigner_price ?? 0) * foreignerCount * tripDuration;
  return localTotal + foreignerTotal;
}

export function minimumDeposit(total: number): number {
  return Math.ceil(total * 0.5);
}
