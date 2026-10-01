import { describe, expect, it } from 'vitest';
import { PATCH as updateBooking, DELETE as deleteBooking } from '@/app/api/v1/bookings/[id]/route';
import { POST as supplierCancel } from '@/app/api/v1/bookings/[id]/supplier-cancel/route';
import { POST as adminCancel } from '@/app/api/v1/bookings/[id]/admin-cancel/route';
import { POST as refundSent } from '@/app/api/v1/bookings/[id]/refund-sent/route';
import { POST as manualConfirm } from '@/app/api/v1/bookings/[id]/manual-confirm/route';
import { POST as collectBalance } from '@/app/api/v1/bookings/[id]/collect-balance/route';
import { POST as manualRefund } from '@/app/api/v1/bookings/[id]/manual-refund/route';
import {
  createSupplierUser,
  createAdminUser,
  createTrip,
  createSupplierStorage,
  createBooking,
  futureBookingDate,
  authHeader,
} from '../utils/factories';
import { jsonRequest } from '../utils/http';
import { Booking } from '@/server/models/booking';
import { Wallet } from '@/server/models/wallet';
import { siteWallTimeToUtc, toSiteYmd } from '@/lib/time';
import { computeOccupancy } from '@/lib/booking/occupancy';

describe('booking edit cancel delete routes', () => {
  it('reduces guests and sets refund_owed with wallet debit', async () => {
    const { supplier, user: supplierUser, wallet } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 180, foreigner_price: 500 });
    await createSupplierStorage(supplier._id, { kayak: 10 });

    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      amount: 540,
      amount_paid: 540,
      quantity: 3,
      local_guests: 3,
      foreigner_guests: 0,
      resource_type: 'kayak',
      pricing_snapshot: { price: 180, foreigner_price: 500, guide_price: 0 },
      booking_date: futureBookingDate(),
    });

    await Wallet.updateOne({ _id: wallet._id }, { amount: 540 });

    const res = await updateBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: authHeader(supplierUser.id, supplierUser.role),
        body: {
          local_guests: 2,
          foreigner_guests: 0,
          quantity: 2,
          note: 'one guest no-show',
        },
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.booking.amount).toBe(360);
    expect(body.booking.refund_owed).toBe(180);

    const updatedWallet = await Wallet.findById(wallet._id);
    expect(updatedWallet?.amount).toBe(360);
  });

  it('excludes self from capacity check when increasing quantity', async () => {
    const { supplier, user: supplierUser } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    await createSupplierStorage(supplier._id, { kayak: 5 });

    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      amount: 540,
      quantity: 3,
      local_guests: 3,
      resource_type: 'kayak',
      pricing_snapshot: { price: 180, foreigner_price: 500, guide_price: 0 },
      booking_date: futureBookingDate(),
    });

    const res = await updateBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: authHeader(supplierUser.id, supplierUser.role),
        body: { local_guests: 4, foreigner_guests: 0, quantity: 4 },
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.booking.quantity).toBe(4);
  });

  it('rejects edit from another supplier', async () => {
    const { supplier } = await createSupplierUser();
    const { user: otherSupplier } = await createSupplierUser({
      email: `other_${Date.now()}@test.com`,
      username: `other_${Date.now()}`,
    });
    const trip = await createTrip(supplier._id);
    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      pricing_snapshot: { price: 180, foreigner_price: 500, guide_price: 0 },
    });

    const res = await updateBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: authHeader(otherSupplier.id, otherSupplier.role),
        body: { local_guests: 1, quantity: 1 },
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(res.status).toBe(403);
  });

  it('rejects edit on completed booking', async () => {
    const { supplier, user: supplierUser } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'COMPLETED',
      pricing_snapshot: { price: 180, foreigner_price: 500, guide_price: 0 },
    });

    const res = await updateBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: authHeader(supplierUser.id, supplierUser.role),
        body: { local_guests: 1, quantity: 1 },
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(res.status).toBe(400);
  });

  it('unpaid cancel goes to CANCELLED, paid cancel goes to REFUND_PENDING', async () => {
    const { supplier, user: supplierUser } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id);

    const unpaid = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'PENDING',
      amount_paid: 0,
    });

    const unpaidRes = await supplierCancel(
      jsonRequest(`http://localhost/api/v1/bookings/${unpaid.id}/supplier-cancel`, {
        method: 'POST',
        headers: authHeader(supplierUser.id, supplierUser.role),
      }),
      { params: Promise.resolve({ id: unpaid.id }) },
    );
    expect(unpaidRes.status).toBe(200);
    expect((await unpaidRes.json()).booking.status).toBe('CANCELLED');

    const paid = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      amount: 180,
      amount_paid: 180,
    });

    const paidRes = await adminCancel(
      jsonRequest(`http://localhost/api/v1/bookings/${paid.id}/admin-cancel`, {
        method: 'POST',
        headers: authHeader(admin.id, admin.role),
      }),
      { params: Promise.resolve({ id: paid.id }) },
    );
    expect(paidRes.status).toBe(200);
    expect((await paidRes.json()).booking.status).toBe('REFUND_PENDING');
  });

  it('admin can hard-delete a confirmed booking and debit the wallet', async () => {
    const { supplier, user: supplierUser, wallet } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id);

    await Wallet.updateOne({ _id: wallet._id }, { amount: 500 });
    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      amount: 500,
      amount_paid: 500,
    });

    const okRes = await deleteBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.id}`, {
        method: 'DELETE',
        headers: authHeader(admin.id, admin.role),
        body: { reason: 'test delete' },
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(okRes.status).toBe(200);
    const body = await okRes.json();
    expect(body.wallet_adjustment).toBe(-500);

    expect(await Booking.findById(booking.id)).toBeNull();
    const updatedWallet = await Wallet.findById(wallet._id);
    expect(updatedWallet?.amount).toBe(0);

    const live = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      amount: 180,
    });
    const forbidden = await deleteBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${live.id}`, {
        method: 'DELETE',
        headers: authHeader(supplierUser.id, supplierUser.role),
      }),
      { params: Promise.resolve({ id: live.id }) },
    );
    expect(forbidden.status).toBe(403);
    expect(await Booking.findById(live.id)).not.toBeNull();
  });

  it('marks refund sent and clears refund_owed', async () => {
    const { supplier, user: supplierUser } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      refund_owed: 100,
      amount_paid: 280,
      amount: 180,
    });

    const res = await refundSent(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.id}/refund-sent`, {
        method: 'POST',
        headers: authHeader(supplierUser.id, supplierUser.role),
        body: { note: 'sent via InstaPay' },
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(res.status).toBe(200);
    const sent = (await res.json()).booking;
    expect(sent.refund_owed).toBe(0);
    expect(sent.amount_paid).toBe(180);
  });

  it('manual confirm records amount_paid for refund route', async () => {
    const { supplier, user: supplierUser, wallet } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id);

    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'PENDING',
      amount: 180,
      amount_paid: 0,
    });

    await manualConfirm(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.id}/manual-confirm`, {
        method: 'POST',
        headers: authHeader(supplierUser.id, supplierUser.role),
        body: { amount_paid: 180 },
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );

    await Booking.updateOne({ _id: booking._id }, { status: 'REFUND_PENDING' });

    const refundRes = await import('@/app/api/v1/bookings/[id]/refund/route').then((m) =>
      m.POST(
        jsonRequest(`http://localhost/api/v1/bookings/${booking.id}/refund`, {
          method: 'POST',
          headers: authHeader(admin.id, admin.role),
        }),
        { params: Promise.resolve({ id: booking.id }) },
      ),
    );
    expect(refundRes.status).toBe(200);

    const updatedWallet = await Wallet.findOne({ supplier_id: supplier._id });
    expect(updatedWallet?.amount).toBe(0);
  });

  it('rejects an adults plus kids mismatch and stores a valid kids breakdown', async () => {
    const { supplier, user: supplierUser } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 180, foreigner_price: 500, max_guests: 10 });
    await createSupplierStorage(supplier._id, { kayak: 10 });

    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      amount: 360,
      quantity: 2,
      local_guests: 2,
      foreigner_guests: 0,
      adults: 2,
      kids_1_6: 0,
      kids_7_12: 0,
      resource_type: 'kayak',
      pricing_snapshot: { price: 180, foreigner_price: 500, guide_price: 0 },
      booking_date: futureBookingDate(),
    });

    const mismatch = await updateBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: authHeader(supplierUser.id, supplierUser.role),
        body: {
          local_guests: 3,
          foreigner_guests: 0,
          quantity: 3,
          adults: 1,
          kids_1_6: 1,
        },
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(mismatch.status).toBe(400);

    const ok = await updateBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: authHeader(supplierUser.id, supplierUser.role),
        body: {
          local_guests: 3,
          foreigner_guests: 0,
          quantity: 3,
          adults: 2,
          kids_1_6: 1,
          kids_7_12: 0,
        },
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.booking.adults).toBe(2);
    expect(body.booking.kids_1_6).toBe(1);
    expect(body.booking.quantity).toBe(3);
  });

  it('lets a booking move from a full 09:00 slot to 15:00', async () => {
      const { supplier, user: supplierUser } = await createSupplierUser();
      const trip = await createTrip(supplier._id, { activity_minutes: 60, max_guests: 10 });
      await createSupplierStorage(supplier._id, { kayak: 2 });
      const ymd = toSiteYmd(futureBookingDate());
      const nine = siteWallTimeToUtc(ymd, 9, 0);
      const occupancy = computeOccupancy({
        startsAt: nine,
        blocksWholeDays: false,
        durationDays: 1,
        activityMinutes: 60,
        turnaroundMinutes: 0,
      });

      await createBooking({
        trip_id: trip._id,
        supplier_id: supplier._id,
        status: 'CONFIRMED',
        quantity: 1,
        local_guests: 1,
        resource_type: 'kayak',
        booking_date: nine,
        ...occupancy,
      });

      const movable = await createBooking({
        trip_id: trip._id,
        supplier_id: supplier._id,
        status: 'CONFIRMED',
        quantity: 1,
        local_guests: 1,
        resource_type: 'kayak',
        booking_date: nine,
        ...occupancy,
      });

      const res = await updateBooking(
        jsonRequest(`http://localhost/api/v1/bookings/${movable.id}`, {
          method: 'PATCH',
          headers: authHeader(supplierUser.id, supplierUser.role),
          body: { booking_date: siteWallTimeToUtc(ymd, 15, 0).toISOString() },
        }),
        { params: Promise.resolve({ id: movable.id }) },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(toSiteYmd(new Date(body.booking.booking_date))).toBe(ymd);
  });
});

describe('booking edit trip switch', () => {
  function patch(bookingId: string, user: { id: string; role: number }, body: object) {
    return updateBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: authHeader(user.id, user.role),
        body,
      }),
      { params: Promise.resolve({ id: bookingId }) },
    );
  }

  it('switches a paid private tour to a cheaper free tour and reprices from the new trip', async () => {
    const { supplier, user: supplierUser, wallet } = await createSupplierUser();
    const privateTour = await createTrip(supplier._id, {
      is_tour: true,
      price: 500,
      foreigner_price: 900,
      guide_mandatory: true,
      guide_price: 300,
    });
    const freeTour = await createTrip(supplier._id, {
      is_tour: true,
      price: 200,
      foreigner_price: 400,
      name: { en: 'Free Tour', ar: 'جولة حرة' },
    });
    await createSupplierStorage(supplier._id, { kayak: 10 });

    // 5 locals x 500 x 2h + mandatory guide 300
    const booking = await createBooking({
      trip_id: privateTour._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      amount: 5300,
      amount_paid: 5300,
      quantity: 5,
      local_guests: 5,
      foreigner_guests: 0,
      duration: 2,
      resource_type: 'kayak',
      pricing_snapshot: { price: 500, foreigner_price: 900, guide_price: 300 },
      booking_date: futureBookingDate(),
    });
    await Wallet.updateOne({ _id: wallet._id }, { amount: 5300 });

    const res = await patch(booking.id, supplierUser, {
      trip_id: freeTour.id,
      local_guests: 3,
      foreigner_guests: 0,
      quantity: 3,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    // 3 x 200 x 2h, and the old trip's mandatory guide no longer applies
    expect(body.booking.amount).toBe(1200);
    expect(body.booking.refund_owed).toBe(4100);

    const saved = await Booking.findById(booking.id);
    expect(saved?.trip_id.toString()).toBe(freeTour.id);
    expect(saved?.pricing_snapshot.price).toBe(200);
    expect(saved?.pricing_snapshot.guide_price).toBe(0);
    const revision = saved?.revisions.at(-1);
    expect(revision?.changes.get('trip_id')).toMatchObject({
      from: privateTour.id,
      to: freeTour.id,
    });

    const updatedWallet = await Wallet.findById(wallet._id);
    expect(updatedWallet?.amount).toBe(1200);
  });

  it('gives a non-tour booking a duration when it moves onto a tour', async () => {
    const { supplier, user: supplierUser } = await createSupplierUser();
    const rental = await createTrip(supplier._id);
    const tour = await createTrip(supplier._id, { is_tour: true, price: 200, duration: 3 });
    await createSupplierStorage(supplier._id, { kayak: 10 });

    const booking = await createBooking({
      trip_id: rental._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      amount: 360,
      quantity: 2,
      local_guests: 2,
      duration: 0,
      resource_type: 'kayak',
      pricing_snapshot: { price: 180, foreigner_price: 500, guide_price: 0 },
      booking_date: futureBookingDate(),
    });

    const res = await patch(booking.id, supplierUser, { trip_id: tour.id });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.booking.duration).toBe(3);
    expect(body.booking.amount).toBe(1200);
  });

  it('rejects a trip from another supplier or one that is not bookable', async () => {
    const { supplier, user: supplierUser } = await createSupplierUser();
    const { supplier: otherSupplier } = await createSupplierUser({
      email: `other_${Date.now()}@test.com`,
      username: `other_${Date.now()}`,
    });
    const trip = await createTrip(supplier._id);
    const foreignTrip = await createTrip(otherSupplier._id);
    const inactiveTrip = await createTrip(supplier._id, { status: 'inactive' });
    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      pricing_snapshot: { price: 180, foreigner_price: 500, guide_price: 0 },
      booking_date: futureBookingDate(),
    });

    const foreign = await patch(booking.id, supplierUser, { trip_id: foreignTrip.id });
    expect(foreign.status).toBe(400);
    const inactive = await patch(booking.id, supplierUser, { trip_id: inactiveTrip.id });
    expect(inactive.status).toBe(400);

    const saved = await Booking.findById(booking.id);
    expect(saved?.trip_id.toString()).toBe(trip.id);
  });

  it('requires an admin amount override to switch a price-locked booking', async () => {
    const { supplier, user: supplierUser } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id);
    const other = await createTrip(supplier._id, { price: 100 });
    await createSupplierStorage(supplier._id, { kayak: 10 });
    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      amount: 540,
      quantity: 3,
      local_guests: 3,
      resource_type: 'kayak',
      pricing_locked: true,
      pricing_snapshot: { price: 180, foreigner_price: 500, guide_price: 0 },
      booking_date: futureBookingDate(),
    });

    const bySupplier = await patch(booking.id, supplierUser, { trip_id: other.id });
    expect(bySupplier.status).toBe(403);
    const byAdminNoOverride = await patch(booking.id, admin, { trip_id: other.id });
    expect(byAdminNoOverride.status).toBe(400);

    const byAdmin = await patch(booking.id, admin, { trip_id: other.id, amount_override: 250 });
    expect(byAdmin.status).toBe(200);
    const body = await byAdmin.json();
    expect(body.booking.amount).toBe(250);
    expect(body.booking.trip_id).toBe(other.id);
  });
});

describe('booking edit balance after price changes', () => {
  function post(
    handler: typeof collectBalance,
    path: string,
    bookingId: string,
    user: { id: string; role: number },
    body: object = {},
  ) {
    return handler(
      jsonRequest(`http://localhost/api/v1/bookings/${bookingId}/${path}`, {
        method: 'POST',
        headers: authHeader(user.id, user.role),
        body,
      }),
      { params: Promise.resolve({ id: bookingId }) },
    );
  }

  function patch(bookingId: string, user: { id: string; role: number }, body: object) {
    return updateBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: authHeader(user.id, user.role),
        body,
      }),
      { params: Promise.resolve({ id: bookingId }) },
    );
  }

  /** Paid in full: 5 locals x 275 = 1375, wallet holding the 1375. */
  async function paidPrivateTour() {
    const { supplier, user, wallet } = await createSupplierUser();
    const privateTour = await createTrip(supplier._id, { price: 275, foreigner_price: 850 });
    const freeTour = await createTrip(supplier._id, { price: 180, foreigner_price: 500 });
    await createSupplierStorage(supplier._id, { kayak: 10 });
    const booking = await createBooking({
      trip_id: privateTour._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      amount: 1375,
      amount_paid: 1375,
      quantity: 5,
      local_guests: 5,
      resource_type: 'kayak',
      pricing_snapshot: { price: 275, foreigner_price: 850, guide_price: 0 },
      booking_date: futureBookingDate(),
    });
    await Wallet.updateOne({ _id: wallet._id }, { amount: 1375 });
    const walletAmount = async () => (await Wallet.findById(wallet._id))?.amount;
    return { user, privateTour, freeTour, booking, walletAmount };
  }

  it('lets the supplier collect the increase on a confirmed booking', async () => {
    const { user, booking, walletAmount } = await paidPrivateTour();

    const res = await patch(booking.id, user, { local_guests: 7, quantity: 7 });
    expect(res.status).toBe(200);
    const edited = (await res.json()).booking;
    expect(edited.amount).toBe(1925);
    expect(edited.refund_owed).toBe(0);
    expect(await walletAmount()).toBe(1375);

    const collect = await post(collectBalance, 'collect-balance', booking.id, user);
    expect(collect.status).toBe(200);
    expect((await collect.json()).booking.amount_paid).toBe(1925);
    expect(await walletAmount()).toBe(1925);
  });

  it('nets an unsent refund against a later increase instead of stacking it', async () => {
    const { user, privateTour, freeTour, booking, walletAmount } = await paidPrivateTour();

    // private -> free: 3 x 180 = 540, 835 owed back
    const down = await patch(booking.id, user, {
      trip_id: freeTour.id,
      local_guests: 3,
      quantity: 3,
    });
    expect((await down.json()).booking.refund_owed).toBe(835);
    expect(await walletAmount()).toBe(540);

    // two more guests before the refund went out: 5 x 180 = 900, 475 owed
    const smaller = await patch(booking.id, user, { local_guests: 5, quantity: 5 });
    expect((await smaller.json()).booking.refund_owed).toBe(475);
    expect(await walletAmount()).toBe(900);

    // back to private with 6 guests: 6 x 275 = 1650, nothing owed, 275 to collect
    const up = await patch(booking.id, user, {
      trip_id: privateTour.id,
      local_guests: 6,
      quantity: 6,
    });
    const upBody = (await up.json()).booking;
    expect(upBody.amount).toBe(1650);
    expect(upBody.refund_owed).toBe(0);
    expect(await walletAmount()).toBe(1375);

    const collect = await post(collectBalance, 'collect-balance', booking.id, user);
    expect(collect.status).toBe(200);
    expect(await walletAmount()).toBe(1650);

    const saved = await Booking.findById(booking.id);
    const ledger = (saved!.payment_entries as { amount: number }[]).reduce(
      (sum, e) => sum + e.amount,
      0,
    );
    // The seeded 1375 has no entry, so the entries net to what changed since.
    expect(ledger).toBe(1650 - 1375);
  });

  it('collects the full increase after the refund was already sent', async () => {
    const { user, privateTour, freeTour, booking, walletAmount } = await paidPrivateTour();

    await patch(booking.id, user, { trip_id: freeTour.id, local_guests: 3, quantity: 3 });
    const sent = await post(refundSent, 'refund-sent', booking.id, user);
    expect((await sent.json()).booking.amount_paid).toBe(540);

    const up = await patch(booking.id, user, {
      trip_id: privateTour.id,
      local_guests: 5,
      quantity: 5,
    });
    const upBody = (await up.json()).booking;
    expect(upBody.amount).toBe(1375);
    expect(upBody.refund_owed).toBe(0);
    expect(await walletAmount()).toBe(540);

    const collect = await post(collectBalance, 'collect-balance', booking.id, user, {
      amount: 835,
    });
    expect(collect.status).toBe(200);
    expect(await walletAmount()).toBe(1375);
  });

  it('refunds only what the wallet still holds after an edit refund', async () => {
    const { user, freeTour, booking, walletAmount } = await paidPrivateTour();

    await patch(booking.id, user, { trip_id: freeTour.id, local_guests: 3, quantity: 3 });
    expect(await walletAmount()).toBe(540);

    const refund = await post(manualRefund, 'manual-refund', booking.id, user);
    expect(refund.status).toBe(200);
    expect(await walletAmount()).toBe(0);
  });

  it('raises a full-payment declaration on a pending booking with the price', async () => {
    const { supplier, user } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 275 });
    await createSupplierStorage(supplier._id, { kayak: 10 });
    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'PENDING',
      amount: 1375,
      declared_amount: 1375,
      quantity: 5,
      local_guests: 5,
      resource_type: 'kayak',
      pricing_snapshot: { price: 275, foreigner_price: 850, guide_price: 0 },
      booking_date: futureBookingDate(),
    });

    const res = await patch(booking.id, user, { local_guests: 6, quantity: 6 });
    const body = (await res.json()).booking;
    expect(body.amount).toBe(1650);
    expect(body.declared_amount).toBe(1650);
  });
});
