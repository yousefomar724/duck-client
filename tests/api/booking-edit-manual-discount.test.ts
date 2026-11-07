import { beforeAll, describe, expect, it } from 'vitest';
import { POST as createManualBooking } from '@/app/api/v1/bookings/manual/route';
import { PATCH as editBooking } from '@/app/api/v1/bookings/[id]/route';
import { POST as manualConfirm } from '@/app/api/v1/bookings/[id]/manual-confirm/route';
import { POST as createCode } from '@/app/api/v1/discount-codes/route';
import {
  authHeader,
  createAdminUser,
  createSupplierStorage,
  createSupplierUser,
  createTrip,
  futureBookingDate,
} from '../utils/factories';
import { jsonRequest } from '../utils/http';
import { Booking } from '@/server/models/booking';
import { DiscountCode } from '@/server/models/discount-code';
import { DiscountRedemption } from '@/server/models/discount-redemption';
import { Wallet } from '@/server/models/wallet';
import { SupplierStorage } from '@/server/models/supplier-storage';
import { addSiteDays, siteWallTimeToUtc, toSiteYmd } from '@/lib/time';

beforeAll(async () => {
  await DiscountCode.syncIndexes();
  await DiscountRedemption.syncIndexes();
});

const futureExpiry = () => new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

/** Noon in Cairo a few days ago: inside opening hours, well past the grace window. */
function pastBookingDate(daysAgo = 3): Date {
  return siteWallTimeToUtc(addSiteDays(toSiteYmd(new Date()), -daysAgo), 12, 0);
}

function tokenOf(user: { id: string; role: number }) {
  return authHeader(user.id, user.role).Authorization.replace('Bearer ', '');
}

async function walletAmount(id: unknown) {
  return (await Wallet.findById(id))?.amount ?? 0;
}

async function book(tripId: string, extra: Record<string, unknown> = {}) {
  const res = await createManualBooking(
    jsonRequest('http://localhost/api/v1/bookings/manual', {
      method: 'POST',
      body: {
        trip_id: tripId,
        full_name: 'Guest User',
        phone_number: '+201012345678',
        booking_date: futureBookingDate().toISOString(),
        resource_type: 'kayak',
        quantity: 1,
        local_guests: 1,
        adults: 1,
        ...extra,
      },
    }),
  );
  expect(res.status).toBe(201);
  return (await res.json()).booking;
}

function edit(id: string, token: string, body: Record<string, unknown>) {
  return editBooking(
    jsonRequest(`http://localhost/api/v1/bookings/${id}`, { method: 'PATCH', token, body }),
    { params: Promise.resolve({ id }) },
  );
}

function confirm(id: string, token: string, amountPaid: number) {
  return manualConfirm(
    jsonRequest(`http://localhost/api/v1/bookings/${id}/manual-confirm`, {
      method: 'POST',
      token,
      body: { amount_paid: amountPaid },
    }),
    { params: Promise.resolve({ id }) },
  );
}

/** Moves a booking into the past, as the release cron would leave it. */
async function endBooking(id: string, status = 'COMPLETED') {
  const date = pastBookingDate();
  await Booking.updateOne(
    { _id: id },
    {
      $set: {
        status,
        booking_date: date,
        starts_at: date,
        ends_at: new Date(date.getTime() + 60 * 60 * 1000),
        occupancy_slots: [date],
      },
    },
  );
  return date;
}

async function setup() {
  const { user, supplier, wallet } = await createSupplierUser();
  const { user: admin } = await createAdminUser();
  const trip = await createTrip(supplier._id, { price: 1000, guide_price: 0, max_guests: 10 });
  await createSupplierStorage(supplier._id, { kayak: 8 });
  return {
    supplier,
    wallet,
    trip,
    supplierToken: tokenOf(user),
    adminToken: tokenOf(admin),
  };
}

describe('manual discount on booking edit', () => {
  it('lets an admin give a percentage discount with no code, paid by Duck by default', async () => {
    const { trip, adminToken } = await setup();
    const booking = await book(trip.id);

    const res = await edit(booking.ID, adminToken, {
      manual_discount: { type: 'percentage', value: 15, reason: 'late start' },
    });
    expect(res.status).toBe(200);
    const next = (await res.json()).booking;
    expect(next.subtotal).toBe(1000);
    expect(next.amount).toBe(850);
    expect(next.discount).toMatchObject({
      code: 'MANUAL',
      code_id: null,
      source: 'manual',
      type: 'percentage',
      value: 15,
      funded_by: 'platform',
      amount: 150,
      reason: 'late start',
    });
    expect(await DiscountRedemption.countDocuments({ booking_id: booking.ID })).toBe(0);

    const stored = await Booking.findById(booking.ID);
    const revision = stored!.revisions.at(-1)!;
    expect(revision.changes.get('discount_code')).toMatchObject({ from: null, to: 'MANUAL' });
    expect(revision.changes.get('discount_rule')).toMatchObject({
      from: null,
      to: 'MANUAL 15% platform (late start)',
    });
  });

  it('keeps a supplier discount on the supplier and refuses a Duck-funded one', async () => {
    const { trip, supplierToken } = await setup();
    const booking = await book(trip.id);

    const refused = await edit(booking.ID, supplierToken, {
      manual_discount: { type: 'fixed', value: 100, funded_by: 'platform' },
    });
    expect(refused.status).toBe(403);

    const res = await edit(booking.ID, supplierToken, {
      manual_discount: { type: 'fixed', value: 100 },
    });
    expect(res.status).toBe(200);
    const next = (await res.json()).booking;
    expect(next.amount).toBe(900);
    expect(next.discount).toMatchObject({ source: 'manual', funded_by: 'supplier', amount: 100 });
  });

  it('replaces a code, giving its use back, and is removed like a code', async () => {
    const { trip, supplierToken, adminToken } = await setup();
    const created = await createCode(
      jsonRequest('http://localhost/api/v1/discount-codes', {
        method: 'POST',
        token: supplierToken,
        body: { code: 'SPRING10', type: 'percentage', value: 10, expires_at: futureExpiry() },
      }),
    );
    expect(created.status).toBe(201);
    const code = await created.json();
    const booking = await book(trip.id, { discount_code: 'SPRING10' });
    expect(booking.amount).toBe(900);

    const res = await edit(booking.ID, adminToken, {
      manual_discount: { type: 'fixed', value: 250, funded_by: 'supplier' },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).booking.amount).toBe(750);
    expect((await DiscountCode.findById(code.id))?.used_count).toBe(0);
    const redemption = await DiscountRedemption.findOne({ booking_id: booking.ID });
    expect(redemption?.status).toBe('released');
    expect(redemption?.released_reason).toBe('edit_replaced');

    const removed = await edit(booking.ID, adminToken, { discount_code: null });
    expect(removed.status).toBe(200);
    const plain = (await removed.json()).booking;
    expect(plain.amount).toBe(1000);
    expect(plain.discount).toBeNull();
  });

  it('reapplies an unchanged manual rule when the guests change', async () => {
    const { trip, adminToken } = await setup();
    const booking = await book(trip.id);
    await edit(booking.ID, adminToken, {
      manual_discount: { type: 'percentage', value: 10, funded_by: 'supplier' },
    });

    const res = await edit(booking.ID, adminToken, {
      quantity: 2,
      local_guests: 2,
      adults: 2,
      manual_discount: { type: 'percentage', value: 10, funded_by: 'supplier' },
    });
    expect(res.status).toBe(200);
    const next = (await res.json()).booking;
    expect(next.subtotal).toBe(2000);
    expect(next.amount).toBe(1800);
    expect(next.discount.amount).toBe(200);
  });

  it('settles the Duck credit on a confirmed booking', async () => {
    const { wallet, trip, supplierToken, adminToken } = await setup();
    const booking = await book(trip.id);
    expect((await confirm(booking.ID, supplierToken, 1000)).status).toBe(200);
    expect(await walletAmount(wallet._id)).toBe(1000);

    const res = await edit(booking.ID, adminToken, {
      manual_discount: { type: 'fixed', value: 200 },
    });
    expect(res.status).toBe(200);
    const next = (await res.json()).booking;
    expect(next.amount).toBe(800);
    // The customer is owed 200 back; Duck covers the same 200 for the supplier.
    expect(next.refund_owed).toBe(200);
    expect(next.platform_discount_credited).toBe(200);
    expect(await walletAmount(wallet._id)).toBe(1000);
  });

  it('rejects a bad rule and sending a code with a manual discount', async () => {
    const { trip, adminToken } = await setup();
    const booking = await book(trip.id);

    const tooMuch = await edit(booking.ID, adminToken, {
      manual_discount: { type: 'percentage', value: 120 },
    });
    expect(tooMuch.status).toBe(400);

    const both = await edit(booking.ID, adminToken, {
      discount_code: 'ANYCODE',
      manual_discount: { type: 'fixed', value: 50 },
    });
    expect(both.status).toBe(400);

    const stored = await Booking.findById(booking.ID);
    expect(stored?.amount).toBe(1000);
    expect(stored?.discount).toBeNull();
  });

  it('reserves the MANUAL name for discount codes', async () => {
    const { supplierToken } = await setup();
    const res = await createCode(
      jsonRequest('http://localhost/api/v1/discount-codes', {
        method: 'POST',
        token: supplierToken,
        body: { code: 'manual', type: 'percentage', value: 10, expires_at: futureExpiry() },
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe('admin correction of an ended booking', () => {
  it('lets an admin change the guests and give a discount after the trip', async () => {
    const { wallet, trip, supplierToken, adminToken } = await setup();
    const booking = await book(trip.id);
    expect((await confirm(booking.ID, supplierToken, 1000)).status).toBe(200);
    const date = await endBooking(booking.ID);

    const res = await edit(booking.ID, adminToken, {
      quantity: 3,
      local_guests: 3,
      adults: 3,
      manual_discount: { type: 'fixed', value: 500, funded_by: 'supplier' },
      note: 'two more guests joined at the dock',
    });
    expect(res.status).toBe(200);
    const next = (await res.json()).booking;
    expect(next.status).toBe('COMPLETED');
    expect(new Date(next.booking_date).getTime()).toBe(date.getTime());
    expect(next.subtotal).toBe(3000);
    expect(next.amount).toBe(2500);
    expect(next.refund_owed).toBe(0);
    expect(await walletAmount(wallet._id)).toBe(1000);
  });

  it('lets an admin switch the trip of a no-show to another trip of the supplier', async () => {
    const { supplier, trip, adminToken } = await setup();
    const other = await createTrip(supplier._id, { price: 600, guide_price: 0, max_guests: 10 });
    const booking = await book(trip.id);
    await endBooking(booking.ID, 'NO_SHOW');

    const res = await edit(booking.ID, adminToken, { trip_id: other.id });
    expect(res.status).toBe(200);
    const next = (await res.json()).booking;
    expect(next.trip_id).toBe(other.id);
    expect(next.amount).toBe(600);
    expect(next.status).toBe('NO_SHOW');
  });

  it('skips the equipment check for a slot that is already over', async () => {
    const { supplier, trip, adminToken } = await setup();
    await SupplierStorage.updateOne({ supplier_id: supplier._id }, { $set: { resources: { kayak: 1 } } });
    const first = await book(trip.id);
    const second = await book(trip.id, { booking_date: futureBookingDate(96).toISOString() });
    const date = await endBooking(first.ID);
    await endBooking(second.ID);

    // Both now sit in the same past slot of a one-kayak supplier, so asking for
    // two kayaks would fail the capacity check on an upcoming booking.
    const res = await edit(second.ID, adminToken, { quantity: 2, local_guests: 2, adults: 2 });
    expect(res.status).toBe(200);
    expect(new Date((await res.json()).booking.booking_date).getTime()).toBe(date.getTime());
  });

  it('does not let a supplier edit a booking whose time has passed', async () => {
    const { trip, supplierToken } = await setup();
    const completed = await book(trip.id);
    await endBooking(completed.ID);
    const late = await book(trip.id);
    await endBooking(late.ID, 'CONFIRMED');

    const a = await edit(completed.ID, supplierToken, {
      manual_discount: { type: 'fixed', value: 50 },
    });
    expect(a.status).toBe(400);
    const b = await edit(late.ID, supplierToken, {
      manual_discount: { type: 'fixed', value: 50 },
    });
    expect(b.status).toBe(400);
  });

  it('does not move an ended booking into the future', async () => {
    const { trip, adminToken } = await setup();
    const booking = await book(trip.id);
    await endBooking(booking.ID);

    const res = await edit(booking.ID, adminToken, {
      booking_date: futureBookingDate().toISOString(),
    });
    expect(res.status).toBe(400);
  });

  it('still refuses a cancelled booking', async () => {
    const { trip, adminToken } = await setup();
    const booking = await book(trip.id);
    await Booking.updateOne({ _id: booking.ID }, { $set: { status: 'CANCELLED' } });

    const res = await edit(booking.ID, adminToken, {
      manual_discount: { type: 'fixed', value: 50 },
    });
    expect(res.status).toBe(400);
  });
});
