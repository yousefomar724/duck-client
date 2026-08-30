import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { POST as createManualBooking } from '@/app/api/v1/bookings/manual/route';
import { POST as changeStatus } from '@/app/api/v1/bookings/[id]/status/route';
import {
  createSupplierUser,
  createAdminUser,
  createTrip,
  createSupplierStorage,
  createBooking,
  authHeader,
} from '../utils/factories';
import { jsonRequest } from '../utils/http';
import { Booking } from '@/server/models/booking';
import { siteWallTimeToUtc, toSiteYmd } from '@/lib/time';
import { computeOccupancy } from '@/lib/booking/occupancy';

const previousFlag = process.env.OPS_HOURLY_CAPACITY;

function futureYmd(): string {
  const d = new Date(Date.now() + 72 * 60 * 60 * 1000);
  return toSiteYmd(d);
}

function at(ymd: string, hour: number, minute = 0) {
  return siteWallTimeToUtc(ymd, hour, minute);
}

describe('hourly availability', () => {
  beforeAll(() => {
    process.env.OPS_HOURLY_CAPACITY = '1';
  });

  afterAll(() => {
    if (previousFlag === undefined) delete process.env.OPS_HOURLY_CAPACITY;
    else process.env.OPS_HOURLY_CAPACITY = previousFlag;
  });

  it('rejects a third 2-unit booking at 09:00 but accepts it at 12:00', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { activity_minutes: 60 });
    await createSupplierStorage(supplier._id, { kayak: 4 });
    const ymd = futureYmd();

    for (let i = 0; i < 2; i++) {
      const res = await createManualBooking(
        jsonRequest('http://localhost/api/v1/bookings/manual', {
          method: 'POST',
          body: {
            trip_id: trip.id,
            full_name: `Guest ${i}`,
            phone_number: `+20101234567${i}`,
            booking_date: at(ymd, 9).toISOString(),
            resource_type: 'kayak',
            quantity: 2,
            local_guests: 2,
          },
        }),
      );
      expect(res.status).toBe(201);
    }

    const blocked = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Blocked',
          phone_number: '+201012345679',
          booking_date: at(ymd, 9).toISOString(),
          resource_type: 'kayak',
          quantity: 2,
          local_guests: 2,
        },
      }),
    );
    expect(blocked.status).toBe(409);
    const blockedBody = await blocked.json();
    expect(blockedBody.code).toBe('NO_AVAILABILITY');
    expect(blockedBody.error).toContain('09:00');

    const later = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Noon',
          phone_number: '+201012345670',
          booking_date: at(ymd, 12).toISOString(),
          resource_type: 'kayak',
          quantity: 2,
          local_guests: 2,
        },
      }),
    );
    expect(later.status).toBe(201);
  });

  it('a 2h booking at 09:00 blocks 10:00 but not 11:30', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { activity_minutes: 120 });
    await createSupplierStorage(supplier._id, { kayak: 4 });
    const ymd = futureYmd();

    const first = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Two hours',
          phone_number: '+201011111111',
          booking_date: at(ymd, 9).toISOString(),
          resource_type: 'kayak',
          quantity: 4,
          local_guests: 4,
        },
      }),
    );
    expect(first.status).toBe(201);

    const ten = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Ten',
          phone_number: '+201011111112',
          booking_date: at(ymd, 10).toISOString(),
          resource_type: 'kayak',
          quantity: 1,
          local_guests: 1,
        },
      }),
    );
    expect(ten.status).toBe(409);

    const elevenThirty = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Late',
          phone_number: '+201011111113',
          booking_date: at(ymd, 11, 30).toISOString(),
          resource_type: 'kayak',
          quantity: 1,
          local_guests: 1,
        },
      }),
    );
    expect(elevenThirty.status).toBe(201);
  });

  it('NO_SHOW frees capacity while ARRIVED, IN_PROGRESS and PAID do not', async () => {
    const { supplier } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id, { activity_minutes: 60, max_guests: 10 });
    await createSupplierStorage(supplier._id, { kayak: 2 });
    const ymd = futureYmd();
    const start = at(ymd, 9);
    const occupancy = computeOccupancy({
      startsAt: start,
      isTour: false,
      durationDays: 1,
      activityMinutes: 60,
      turnaroundMinutes: 0,
    });

    const occupying = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      quantity: 2,
      local_guests: 2,
      resource_type: 'kayak',
      booking_date: start,
      ...occupancy,
    });

    const paidBlock = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Should fail',
          phone_number: '+201022222221',
          booking_date: start.toISOString(),
          resource_type: 'kayak',
          quantity: 1,
          local_guests: 1,
        },
      }),
    );
    expect(paidBlock.status).toBe(409);

    occupying.status = 'PAID';
    await occupying.save();
    const stillPaid = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Paid still holds',
          phone_number: '+201022222222',
          booking_date: start.toISOString(),
          resource_type: 'kayak',
          quantity: 1,
          local_guests: 1,
        },
      }),
    );
    expect(stillPaid.status).toBe(409);

    occupying.status = 'ARRIVED';
    await occupying.save();
    const stillArrived = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Arrived still holds',
          phone_number: '+201022222223',
          booking_date: start.toISOString(),
          resource_type: 'kayak',
          quantity: 1,
          local_guests: 1,
        },
      }),
    );
    expect(stillArrived.status).toBe(409);

    occupying.status = 'IN_PROGRESS';
    await occupying.save();
    const stillProgress = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'In progress still holds',
          phone_number: '+201022222224',
          booking_date: start.toISOString(),
          resource_type: 'kayak',
          quantity: 1,
          local_guests: 1,
        },
      }),
    );
    expect(stillProgress.status).toBe(409);

    occupying.status = 'CONFIRMED';
    await occupying.save();
    const noShow = await changeStatus(
      jsonRequest(`http://localhost/api/v1/bookings/${occupying.id}/status`, {
        method: 'POST',
        headers: authHeader(admin.id, admin.role),
        body: { status: 'NO_SHOW' },
      }),
      { params: Promise.resolve({ id: occupying.id }) },
    );
    expect(noShow.status).toBe(200);

    const freed = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'After no-show',
          phone_number: '+201022222225',
          booking_date: start.toISOString(),
          resource_type: 'kayak',
          quantity: 2,
          local_guests: 2,
        },
      }),
    );
    expect(freed.status).toBe(201);
  });

  it('subtracts maintenance from the effective limit', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { activity_minutes: 60, max_guests: 10 });
    await createSupplierStorage(supplier._id, { kayak: 4 }, { maintenance: { kayak: 1 } });
    const ymd = futureYmd();

    const fill = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Fill',
          phone_number: '+201033333331',
          booking_date: at(ymd, 9).toISOString(),
          resource_type: 'kayak',
          quantity: 3,
          local_guests: 3,
        },
      }),
    );
    expect(fill.status).toBe(201);

    const overflow = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Overflow',
          phone_number: '+201033333332',
          booking_date: at(ymd, 9).toISOString(),
          resource_type: 'kayak',
          quantity: 1,
          local_guests: 1,
        },
      }),
    );
    expect(overflow.status).toBe(409);
  });

  it('rolls back all but one concurrent create against a limit of 1', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { activity_minutes: 60 });
    await createSupplierStorage(supplier._id, { kayak: 1 });
    const ymd = futureYmd();
    const when = at(ymd, 9).toISOString();

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createManualBooking(
          jsonRequest('http://localhost/api/v1/bookings/manual', {
            method: 'POST',
            body: {
              trip_id: trip.id,
              full_name: `Race ${i}`,
              phone_number: `+20104444444${i}`,
              booking_date: when,
              resource_type: 'kayak',
              quantity: 1,
              local_guests: 1,
            },
          }),
        ),
      ),
    );

    const statuses = results.map((r) => r.status);
    const created = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status === 409);
    expect(created, `statuses=${statuses.join(',')}`).toHaveLength(1);
    expect(rejected).toHaveLength(4);
    expect(await Booking.countDocuments({ trip_id: trip._id })).toBe(1);
  });

  // Partial fills are where an ordered-loser rule that stops at the first
  // limit-crossing writer breaks down: it rolls back that one writer and lets
  // everyone after it through. Exactly floor(limit / qty) must survive.
  it('admits exactly as many concurrent partial-fill creates as the limit allows', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { activity_minutes: 60 });
    await createSupplierStorage(supplier._id, { kayak: 4 });
    const ymd = futureYmd();
    const when = at(ymd, 9).toISOString();

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createManualBooking(
          jsonRequest('http://localhost/api/v1/bookings/manual', {
            method: 'POST',
            body: {
              trip_id: trip.id,
              full_name: `Partial ${i}`,
              phone_number: `+20105555555${i}`,
              booking_date: when,
              resource_type: 'kayak',
              quantity: 2,
              local_guests: 2,
            },
          }),
        ),
      ),
    );

    const statuses = results.map((r) => r.status);
    expect(
      results.filter((r) => r.status === 201),
      `statuses=${statuses.join(',')}`,
    ).toHaveLength(2);
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);

    const surviving = await Booking.find({ trip_id: trip._id }).select('quantity');
    expect(surviving.reduce((sum, b) => sum + b.quantity, 0)).toBeLessThanOrEqual(4);
  });
});
