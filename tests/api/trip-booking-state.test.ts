import { describe, expect, it } from 'vitest';
import {
  buildBooking,
  MinimumGuestsError,
  TripUnavailableError,
} from '@/server/services/booking';
import { createSupplierUser, createTrip, futureBookingDate } from '../utils/factories';

function bookingInput(tripId: string, quantity: number) {
  return {
    trip_id: tripId,
    full_name: 'Guest',
    phone_number: '+201000000001',
    booking_date: futureBookingDate().toISOString(),
    quantity,
  };
}

describe('trip booking state and minimum party size', () => {
  it('rejects a legacy quantity-only booking below the minimum', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { min_guests: 4, max_guests: 8 });

    await expect(buildBooking(null, bookingInput(trip.id, 3))).rejects.toBeInstanceOf(
      MinimumGuestsError,
    );
  });

  it('accepts quantity-only bookings equal to or above the minimum', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { min_guests: 4, max_guests: 8 });

    await expect(buildBooking(null, bookingInput(trip.id, 4))).resolves.toMatchObject({
      quantity: 4,
    });
    await expect(buildBooking(null, bookingInput(trip.id, 6))).resolves.toMatchObject({
      quantity: 6,
    });
  });

  it.each([
    { status: 'inactive' },
    { public_status: 'coming-soon' },
  ])('rejects a trip that is not bookable: %o', async (state) => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, state);

    await expect(buildBooking(null, bookingInput(trip.id, 1))).rejects.toBeInstanceOf(
      TripUnavailableError,
    );
  });
});
