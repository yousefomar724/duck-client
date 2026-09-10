import { describe, expect, it } from 'vitest';
import { buildBooking } from '@/server/services/booking';
import { checkAvailability, NoAvailabilityError } from '@/server/services/availability';
import { getPublicSlotAvailability } from '@/server/services/ops';
import { slotHHMM } from '@/lib/booking/occupancy';
import { siteWallTimeToUtc, toSiteYmd } from '@/lib/time';
import {
  createSupplierStorage,
  createSupplierUser,
  createTrip,
  futureBookingDate,
} from '../utils/factories';

/**
 * An `is_tour` trip lets the customer choose 1-6 HOURS at booking time. Those
 * hours used to be fed to computeOccupancy as `durationDays`, so a single
 * 3-hour kayak booking reserved the whole fleet for three entire days.
 */
describe('tour bookings occupy hours, not whole days', () => {
  it('reserves only the booked window for a 1-hour tour', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, {
      is_tour: true,
      activity_minutes: 0,
      duration: 1,
      max_guests: 30,
    });
    await createSupplierStorage(supplier._id, { kayak: 4 });
    const ymd = toSiteYmd(futureBookingDate());

    const built = await buildBooking(null, {
      trip_id: trip.id,
      full_name: 'Tour Guest',
      phone_number: '+201000000000',
      booking_date: siteWallTimeToUtc(ymd, 9).toISOString(),
      quantity: 4,
      local_guests: 4,
      foreigner_guests: 0,
      resource_type: 'kayak',
      duration: 1,
    });

    expect(built.occupancy_slots.map(slotHHMM)).toEqual(['09:00', '09:30']);
    expect(built.occupancy_slots).toHaveLength(2);
  });

  it('spreads a 3-hour tour across six slots of one day only', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, {
      is_tour: true,
      activity_minutes: 0,
      duration: 1,
      max_guests: 30,
    });
    await createSupplierStorage(supplier._id, { kayak: 4 });
    const ymd = toSiteYmd(futureBookingDate());

    const built = await buildBooking(null, {
      trip_id: trip.id,
      full_name: 'Tour Guest',
      phone_number: '+201000000000',
      booking_date: siteWallTimeToUtc(ymd, 9).toISOString(),
      quantity: 4,
      local_guests: 4,
      foreigner_guests: 0,
      resource_type: 'kayak',
      duration: 3,
    });

    expect(built.occupancy_slots.map(slotHHMM)).toEqual([
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
    ]);
    // Regression: this was 3 x 26 = 78 slots spanning three days.
    expect(built.occupancy_slots).toHaveLength(6);
    expect(new Set(built.occupancy_slots.map(toSiteYmd)).size).toBe(1);
  });

  it('leaves the rest of the day bookable after a full-fleet tour booking', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, {
      is_tour: true,
      activity_minutes: 0,
      duration: 1,
      max_guests: 30,
    });
    await createSupplierStorage(supplier._id, { kayak: 4 });
    const ymd = toSiteYmd(futureBookingDate());

    const built = await buildBooking(null, {
      trip_id: trip.id,
      full_name: 'Tour Guest',
      phone_number: '+201000000000',
      booking_date: siteWallTimeToUtc(ymd, 9).toISOString(),
      quantity: 4,
      local_guests: 4,
      foreigner_guests: 0,
      resource_type: 'kayak',
      duration: 1,
    });
    const { Booking } = await import('@/server/models/booking');
    await Booking.create({ ...built, status: 'CONFIRMED' });

    // The booked hour is genuinely full...
    await expect(
      checkAvailability(supplier.id, 'kayak', [siteWallTimeToUtc(ymd, 9)], 1),
    ).rejects.toBeInstanceOf(NoAvailabilityError);
    // ...but every other hour of the same day is free.
    await expect(
      checkAvailability(supplier.id, 'kayak', [siteWallTimeToUtc(ymd, 12)], 4),
    ).resolves.toBeUndefined();

    const availability = await getPublicSlotAvailability(trip.id, ymd, 'kayak');
    const byTime = new Map(availability!.slots.map((row) => [row.time, row.remaining.kayak]));
    expect(byTime.get('09:00')).toBe(0);
    expect(byTime.get('09:30')).toBe(0);
    expect(byTime.get('10:00')).toBe(4);
    expect(byTime.get('18:30')).toBe(4);
  });
});
