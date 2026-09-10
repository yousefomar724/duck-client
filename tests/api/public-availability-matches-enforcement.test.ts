import { describe, expect, it } from 'vitest';
import { checkAvailability } from '@/server/services/availability';
import { getPublicSlotAvailability } from '@/server/services/ops';
import { computeOccupancy, operatingSlotsForDay, slotHHMM } from '@/lib/booking/occupancy';
import { siteWallTimeToUtc, toSiteYmd } from '@/lib/time';
import {
  createBooking,
  createLegacyBooking,
  createSupplierStorage,
  createSupplierUser,
  createTrip,
  futureBookingDate,
} from '../utils/factories';

describe('public availability', () => {
  it('matches submit-time enforcement for every slot and resource type', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    await createSupplierStorage(supplier._id, { kayak: 4, sup: 2 });
    const ymd = toSiteYmd(futureBookingDate());
    const nine = siteWallTimeToUtc(ymd, 9);
    await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      resource_type: 'kayak',
      quantity: 2,
      booking_date: nine,
      ...computeOccupancy({
        startsAt: nine,
        blocksWholeDays: false,
        durationDays: 1,
        activityMinutes: 60,
        turnaroundMinutes: 0,
      }),
    });
    await createLegacyBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      resource_type: 'kayak',
      quantity: 4,
      booking_date: siteWallTimeToUtc(ymd, 12),
      starts_at: siteWallTimeToUtc(ymd, 12),
      ends_at: siteWallTimeToUtc(ymd, 13),
    });
    const tourOccupancy = computeOccupancy({
      startsAt: nine,
      blocksWholeDays: true,
      durationDays: 1,
      activityMinutes: 60,
      turnaroundMinutes: 0,
    });
    await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      resource_type: 'sup',
      quantity: 2,
      booking_date: nine,
      ...tourOccupancy,
    });
    for (const status of ['COMPLETED', 'CANCELLED'] as const) {
      await createBooking({
        trip_id: trip._id,
        supplier_id: supplier._id,
        resource_type: 'kayak',
        quantity: 4,
        status,
        booking_date: nine,
      });
    }

    const publicData = await getPublicSlotAvailability(trip.id, ymd);
    expect(publicData).not.toBeNull();
    const byTime = new Map(publicData!.slots.map((row) => [row.time, row]));
    for (const slot of operatingSlotsForDay(ymd)) {
      for (const resourceType of ['kayak', 'water_cycle', 'sup']) {
        let accepted = true;
        try {
          await checkAvailability(supplier.id, resourceType, [slot], 1);
        } catch {
          accepted = false;
        }
        const remaining = byTime.get(slotHHMM(slot))?.remaining[resourceType] ?? 0;
        expect(remaining >= 1, `${slotHHMM(slot)} ${resourceType}`).toBe(accepted);
      }
    }
  });
});
