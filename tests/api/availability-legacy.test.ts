import { describe, expect, it } from 'vitest';
import { checkAvailability, NoAvailabilityError } from '@/server/services/availability';
import { computeOccupancy } from '@/lib/booking/occupancy';
import { addSiteDays, siteWallTimeToUtc, startOfSiteDay, toSiteYmd } from '@/lib/time';
import {
  createBooking,
  createLegacyBooking,
  createSupplierStorage,
  createSupplierUser,
  futureBookingDate,
} from '../utils/factories';

function futureYmd() {
  return toSiteYmd(futureBookingDate());
}

describe('legacy hourly availability', () => {
  it('blocks only the legacy window instead of the whole booking day', async () => {
    const { supplier } = await createSupplierUser();
    await createSupplierStorage(supplier._id, { kayak: 4 });
    const ymd = futureYmd();
    await createLegacyBooking({
      supplier_id: supplier._id,
      resource_type: 'kayak',
      quantity: 4,
      booking_date: siteWallTimeToUtc(ymd, 9),
      starts_at: siteWallTimeToUtc(ymd, 9),
      ends_at: siteWallTimeToUtc(ymd, 10),
    });

    await expect(
      checkAvailability(supplier.id, 'kayak', [siteWallTimeToUtc(ymd, 9)], 1),
    ).rejects.toBeInstanceOf(NoAvailabilityError);
    await expect(
      checkAvailability(supplier.id, 'kayak', [siteWallTimeToUtc(ymd, 12)], 1),
    ).resolves.toBeUndefined();
  });

  it('uses a 60-minute aligned fallback when a legacy row has no window', async () => {
    const { supplier } = await createSupplierUser();
    await createSupplierStorage(supplier._id, { kayak: 1 });
    const ymd = futureYmd();
    await createLegacyBooking({
      supplier_id: supplier._id,
      resource_type: 'kayak',
      quantity: 1,
      booking_date: siteWallTimeToUtc(ymd, 9, 15),
    });

    await expect(
      checkAvailability(supplier.id, 'kayak', [siteWallTimeToUtc(ymd, 9, 30)], 1),
    ).rejects.toBeInstanceOf(NoAvailabilityError);
    await expect(
      checkAvailability(supplier.id, 'kayak', [siteWallTimeToUtc(ymd, 10)], 1),
    ).resolves.toBeUndefined();
  });

  it('keeps genuine versioned and legacy multi-day tours bounded to their windows', async () => {
    const { supplier } = await createSupplierUser();
    await createSupplierStorage(supplier._id, { kayak: 1, sup: 1 });
    const day1 = futureYmd();
    const tourOccupancy = computeOccupancy({
      startsAt: siteWallTimeToUtc(day1, 9),
      blocksWholeDays: true,
      durationDays: 3,
      activityMinutes: 60,
      turnaroundMinutes: 0,
    });
    await createBooking({
      supplier_id: supplier._id,
      resource_type: 'kayak',
      quantity: 1,
      booking_date: siteWallTimeToUtc(day1, 9),
      ...tourOccupancy,
    });
    await createLegacyBooking({
      supplier_id: supplier._id,
      resource_type: 'sup',
      quantity: 1,
      booking_date: siteWallTimeToUtc(day1, 9),
      starts_at: siteWallTimeToUtc(day1, 6),
      ends_at: startOfSiteDay(addSiteDays(day1, 3)),
    });

    for (let offset = 0; offset < 3; offset += 1) {
      const slot = siteWallTimeToUtc(addSiteDays(day1, offset), 12);
      await expect(checkAvailability(supplier.id, 'kayak', [slot], 1)).rejects.toBeInstanceOf(
        NoAvailabilityError,
      );
      await expect(checkAvailability(supplier.id, 'sup', [slot], 1)).rejects.toBeInstanceOf(
        NoAvailabilityError,
      );
    }
    const day4Slot = siteWallTimeToUtc(addSiteDays(day1, 3), 12);
    await expect(checkAvailability(supplier.id, 'kayak', [day4Slot], 1)).resolves.toBeUndefined();
    await expect(checkAvailability(supplier.id, 'sup', [day4Slot], 1)).resolves.toBeUndefined();
  });
});
