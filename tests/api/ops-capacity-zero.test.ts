import { describe, expect, it } from 'vitest';
import { bandFromPct, utilisationPct } from '@/components/dashboard/ops/heat';
import { getOpsDay, loadCapacity } from '@/server/services/ops';
import { siteWallTimeToUtc, toSiteYmd } from '@/lib/time';
import {
  createBooking,
  createSupplierStorage,
  createSupplierUser,
  futureBookingDate,
} from '../utils/factories';

describe('ops capacity arithmetic', () => {
  it('distinguishes configured zero and all-in-maintenance from unoffered types', async () => {
    const { supplier } = await createSupplierUser();
    await createSupplierStorage(
      supplier._id,
      { kayak: 0, sup: 4 },
      { maintenance: { kayak: 0, sup: 4 } },
    );

    const capacity = await loadCapacity(supplier.id);
    expect(capacity.per_resource).toEqual([
      { type: 'kayak', capacity: 0, maintenance: 0, raw: 0, offered: true },
      { type: 'sup', capacity: 0, maintenance: 4, raw: 4, offered: true },
    ]);
    expect(capacity.per_resource.some((row) => row.type === 'water_cycle')).toBe(false);
    expect(utilisationPct(3, 0)).toBe(0);
    expect(bandFromPct(utilisationPct(3, 0))).toBe('available');
  });

  it('uses the fullest offered resource as the hour band', async () => {
    const { supplier } = await createSupplierUser();
    await createSupplierStorage(supplier._id, { kayak: 4, water_cycle: 18 });
    const ymd = toSiteYmd(futureBookingDate());
    await createBooking({
      supplier_id: supplier._id,
      resource_type: 'kayak',
      quantity: 4,
      local_guests: 4,
      status: 'CONFIRMED',
      booking_date: siteWallTimeToUtc(ymd, 9),
    });

    const day = await getOpsDay(supplier.id, ymd);
    const hour = day.hours.find((row) => row.hour === '09:00');
    expect(hour?.band).toBe('full');
    expect(hour?.pct).toBe(100);
    expect(hour?.per_resource.find((row) => row.type === 'kayak')).toMatchObject({
      units: 4,
      capacity: 4,
      band: 'full',
    });
  });
});
