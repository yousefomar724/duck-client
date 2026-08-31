import { describe, expect, it } from 'vitest';
import { POST as createManualBooking } from '@/app/api/v1/bookings/manual/route';
import { GET as getOpsDay } from '@/app/api/v1/ops/day/route';
import {
  createSupplierUser,
  createTrip,
  createSupplierStorage,
  authHeader,
} from '../utils/factories';
import { jsonRequest, parseJson } from '../utils/http';
import { Wallet } from '@/server/models/wallet';
import { REVENUE_STATUSES } from '@/lib/bookings/stats';
import { siteWallTimeToUtc, toSiteYmd } from '@/lib/time';

function futureYmd(): string {
  return toSiteYmd(new Date(Date.now() + 72 * 60 * 60 * 1000));
}

async function walkIn(
  tripId: string,
  when: string,
  headers: Record<string, string>,
  body: Record<string, unknown> = {},
) {
  return createManualBooking(
    jsonRequest('http://localhost/api/v1/bookings/manual', {
      method: 'POST',
      headers,
      body: {
        trip_id: tripId,
        full_name: 'Walk In',
        phone_number: '+201099887766',
        booking_date: when,
        resource_type: 'kayak',
        quantity: 2,
        local_guests: 2,
        foreigner_guests: 0,
        source: 'walk_in',
        ...body,
      },
    }),
  );
}

describe('walk-in bookings', () => {
  it('is CONFIRMED and fully paid on creation, so it counts as revenue', async () => {
    const { supplier, user } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 180, activity_minutes: 60 });
    await createSupplierStorage(supplier._id, { kayak: 10 });
    const when = siteWallTimeToUtc(futureYmd(), 9, 0).toISOString();

    const res = await walkIn(trip.id, when, authHeader(user.id, user.role));
    expect(res.status).toBe(201);

    const { booking } = await parseJson<{ booking: Record<string, unknown> }>(res);
    expect(booking.status).toBe('CONFIRMED');
    expect(booking.source).toBe('walk_in');
    // 2 local guests x 180
    expect(booking.amount).toBe(360);
    expect(booking.amount_paid).toBe(360);
    // a CONFIRMED booking is what makes it visible to every revenue rollup
    expect(REVENUE_STATUSES).toContain(booking.status as never);

    const wallet = await Wallet.findOne({ supplier_id: supplier._id });
    expect(wallet?.amount).toBe(360);
  });

  it('records a partial payment and leaves the balance outstanding', async () => {
    const { supplier, user } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 180, activity_minutes: 60 });
    await createSupplierStorage(supplier._id, { kayak: 10 });
    const when = siteWallTimeToUtc(futureYmd(), 10, 0).toISOString();

    const res = await walkIn(trip.id, when, authHeader(user.id, user.role), { amount_paid: 100 });
    const { booking } = await parseJson<{ booking: Record<string, unknown> }>(res);

    expect(booking.status).toBe('CONFIRMED');
    expect(booking.amount_paid).toBe(100);
    expect(booking.amount).toBe(360);

    const wallet = await Wallet.findOne({ supplier_id: supplier._id });
    expect(wallet?.amount).toBe(100);
  });

  it('prices foreign guests at the foreigner rate', async () => {
    const { supplier, user } = await createSupplierUser();
    const trip = await createTrip(supplier._id, {
      price: 180,
      foreigner_price: 500,
      activity_minutes: 60,
    });
    await createSupplierStorage(supplier._id, { kayak: 10 });
    const when = siteWallTimeToUtc(futureYmd(), 11, 0).toISOString();

    const res = await walkIn(trip.id, when, authHeader(user.id, user.role), {
      local_guests: 1,
      foreigner_guests: 1,
    });
    const { booking } = await parseJson<{ booking: Record<string, unknown> }>(res);
    expect(booking.amount).toBe(680); // 180 local + 500 foreigner
    expect(booking.amount_paid).toBe(680);
  });

  it('appears in the ops day revenue and booking totals', async () => {
    const { supplier, user } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 180, activity_minutes: 60 });
    await createSupplierStorage(supplier._id, { kayak: 10 });
    const ymd = futureYmd();
    const when = siteWallTimeToUtc(ymd, 12, 0).toISOString();

    await walkIn(trip.id, when, authHeader(user.id, user.role));

    const dayRes = await getOpsDay(
      jsonRequest(`http://localhost/api/v1/ops/day?date=${ymd}`, {
        headers: authHeader(user.id, user.role),
      }),
    );
    const day = await parseJson<{
      summary: { bookings: number; revenue: number; units: number };
    }>(dayRes);

    expect(day.summary.bookings).toBe(1);
    expect(day.summary.units).toBe(2);
    // the actual regression: a PENDING walk-in contributed 0 here
    expect(day.summary.revenue).toBe(360);
  });

  it('rejects walk_in from an unauthenticated caller', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { activity_minutes: 60 });
    await createSupplierStorage(supplier._id, { kayak: 10 });
    const when = siteWallTimeToUtc(futureYmd(), 13, 0).toISOString();

    const res = await walkIn(trip.id, when, {});
    expect(res.status).toBe(403);
  });
});
