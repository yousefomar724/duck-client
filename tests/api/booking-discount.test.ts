import { beforeAll, describe, expect, it } from 'vitest';
import { POST as createManualBooking } from '@/app/api/v1/bookings/manual/route';
import { POST as manualConfirm } from '@/app/api/v1/bookings/[id]/manual-confirm/route';
import { POST as supplierCancel } from '@/app/api/v1/bookings/[id]/supplier-cancel/route';
import { POST as validateCode } from '@/app/api/v1/discount-codes/validate/route';
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

beforeAll(async () => {
  await DiscountCode.syncIndexes();
  await DiscountRedemption.syncIndexes();
});

const futureExpiry = () => new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

function tokenOf(user: { id: string; role: number }) {
  return authHeader(user.id, user.role).Authorization.replace('Bearer ', '');
}

async function makeCode(
  token: string,
  body: Record<string, unknown>,
) {
  const res = await createCode(
    jsonRequest('http://localhost/api/v1/discount-codes', { method: 'POST', token, body }),
  );
  expect(res.status).toBe(201);
  return res.json();
}

function bookingBody(tripId: string, extra: Record<string, unknown> = {}) {
  return {
    trip_id: tripId,
    full_name: 'Guest User',
    phone_number: '+201012345678',
    booking_date: futureBookingDate().toISOString(),
    resource_type: 'kayak',
    quantity: 1,
    local_guests: 1,
    adults: 1,
    ...extra,
  };
}

describe('booking discount checkout', () => {
  it('stores the server-priced discount and ignores a client amount', async () => {
    const { user, supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 1000, guide_price: 0 });
    await createSupplierStorage(supplier._id, { kayak: 5 });
    await makeCode(tokenOf(user), {
      code: 'tenoff',
      type: 'percentage',
      value: 10,
      expires_at: futureExpiry(),
    });

    const res = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          ...bookingBody(trip.id),
          discount_code: ' tenoff ',
          amount: 1,
          discount: 999,
        },
      }),
    );
    expect(res.status).toBe(201);
    const booking = (await res.json()).booking;
    expect(booking.subtotal).toBe(1000);
    expect(booking.discount.amount).toBe(100);
    expect(booking.discount.code).toBe('TENOFF');
    expect(booking.amount).toBe(900);
    expect(booking.declared_amount).toBe(900);
    const redemption = await DiscountRedemption.findOne({ booking_id: booking.ID });
    expect(redemption?.status).toBe('active');
    expect((await DiscountCode.findOne({ code: 'TENOFF' }))?.used_count).toBe(1);
  });

  it('creates no booking when the code is not eligible', async () => {
    const { user, supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    await createSupplierStorage(supplier._id, { kayak: 5 });
    await makeCode(tokenOf(user), {
      code: 'min500',
      type: 'percentage',
      value: 10,
      min_booking_amount: 500,
      expires_at: futureExpiry(),
    });
    const res = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: bookingBody(trip.id, { discount_code: 'MIN500' }),
      }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('BELOW_MINIMUM');
    expect(await Booking.countDocuments({ trip_id: trip._id })).toBe(0);
    expect((await DiscountCode.findOne({ code: 'MIN500' }))?.used_count).toBe(0);
  });

  it('gives the use back when the booking cannot be kept', async () => {
    const { user, supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    await createSupplierStorage(supplier._id, { kayak: 0 });
    await makeCode(tokenOf(user), {
      code: 'nocap',
      type: 'percentage',
      value: 10,
      expires_at: futureExpiry(),
    });
    const res = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: bookingBody(trip.id, { discount_code: 'NOCAP' }),
      }),
    );
    expect(res.status).toBe(409);
    expect(await Booking.countDocuments({ trip_id: trip._id })).toBe(0);
    expect((await DiscountCode.findOne({ code: 'NOCAP' }))?.used_count).toBe(0);
  });

  it('lets only one of two racing bookings take the last use', async () => {
    const { user, supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 200 });
    await createSupplierStorage(supplier._id, { kayak: 5 });
    await makeCode(tokenOf(user), {
      code: 'onceonly',
      type: 'fixed',
      value: 20,
      currency: 'EGP',
      usage_limit_total: 1,
      expires_at: futureExpiry(),
    });
    const [a, b] = await Promise.all([
      createManualBooking(
        jsonRequest('http://localhost/api/v1/bookings/manual', {
          method: 'POST',
          body: bookingBody(trip.id, { discount_code: 'ONCEONLY', phone_number: '+201011111111' }),
        }),
      ),
      createManualBooking(
        jsonRequest('http://localhost/api/v1/bookings/manual', {
          method: 'POST',
          body: bookingBody(trip.id, { discount_code: 'ONCEONLY', phone_number: '+201022222222', full_name: 'Other' }),
        }),
      ),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);
    expect((await DiscountCode.findOne({ code: 'ONCEONLY' }))?.used_count).toBe(1);
  });

  it('treats the same phone written differently as one customer', async () => {
    const { user, supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 200 });
    await createSupplierStorage(supplier._id, { kayak: 5 });
    await makeCode(tokenOf(user), {
      code: 'onephone',
      type: 'percentage',
      value: 10,
      once_per_customer: true,
      expires_at: futureExpiry(),
    });
    const first = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: bookingBody(trip.id, { discount_code: 'ONEPHONE', phone_number: '01012345678' }),
      }),
    );
    expect(first.status).toBe(201);
    const second = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: bookingBody(trip.id, {
          discount_code: 'ONEPHONE',
          phone_number: '+20 101 234 5678',
          full_name: 'Same Person',
        }),
      }),
    );
    expect(second.status).toBe(409);
    expect((await second.json()).code).toBe('ALREADY_USED_BY_CUSTOMER');
    const other = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: bookingBody(trip.id, { discount_code: 'ONEPHONE', phone_number: '01112345678', full_name: 'Someone Else' }),
      }),
    );
    expect(other.status).toBe(201);

    const [raceA, raceB] = await Promise.all([
      createManualBooking(
        jsonRequest('http://localhost/api/v1/bookings/manual', {
          method: 'POST',
          body: bookingBody(trip.id, { discount_code: 'ONEPHONE', phone_number: '01212345678', full_name: 'Race A' }),
        }),
      ),
      createManualBooking(
        jsonRequest('http://localhost/api/v1/bookings/manual', {
          method: 'POST',
          body: bookingBody(trip.id, { discount_code: 'ONEPHONE', phone_number: '+201212345678', full_name: 'Race B' }),
        }),
      ),
    ]);
    expect([raceA.status, raceB.status].sort()).toEqual([201, 409]);
  });

  it('returns the use when a pending booking is cancelled', async () => {
    const { user, supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    await createSupplierStorage(supplier._id, { kayak: 5 });
    await makeCode(tokenOf(user), {
      code: 'comeback',
      type: 'percentage',
      value: 15,
      once_per_customer: true,
      expires_at: futureExpiry(),
    });
    const created = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: bookingBody(trip.id, { discount_code: 'COMEBACK' }),
      }),
    );
    const booking = (await created.json()).booking;
    const cancel = await supplierCancel(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.ID}/supplier-cancel`, {
        method: 'POST',
        token: tokenOf(user),
        body: { reason: 'test' },
      }),
      { params: Promise.resolve({ id: booking.ID }) },
    );
    expect(cancel.status).toBe(200);
    expect((await DiscountCode.findOne({ code: 'COMEBACK' }))?.used_count).toBe(0);
    const again = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: bookingBody(trip.id, { discount_code: 'COMEBACK' }),
      }),
    );
    expect(again.status).toBe(201);
  });

  it('confirms a free supplier-funded booking without crediting the wallet', async () => {
    const { user, supplier, wallet } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 180 });
    await createSupplierStorage(supplier._id, { kayak: 5 });
    await makeCode(tokenOf(user), {
      code: 'freebie',
      type: 'percentage',
      value: 100,
      expires_at: futureExpiry(),
    });
    const created = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: bookingBody(trip.id, { discount_code: 'FREEBIE' }),
      }),
    );
    const booking = (await created.json()).booking;
    expect(booking.amount).toBe(0);
    expect(booking.declared_amount).toBe(0);
    expect(booking.status).toBe('PENDING');
    const confirm = await manualConfirm(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.ID}/manual-confirm`, {
        method: 'POST',
        token: tokenOf(user),
        body: { amount_paid: 0 },
      }),
      { params: Promise.resolve({ id: booking.ID }) },
    );
    expect(confirm.status).toBe(200);
    expect((await confirm.json()).booking.status).toBe('CONFIRMED');
    expect((await Wallet.findById(wallet._id))?.amount).toBe(0);
  });

  it('prices a walk-in with a code', async () => {
    const { user, supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 200 });
    await createSupplierStorage(supplier._id, { kayak: 5 });
    await makeCode(tokenOf(user), {
      code: 'walkin',
      type: 'fixed',
      value: 50,
      currency: 'EGP',
      expires_at: futureExpiry(),
    });
    const res = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        token: tokenOf(user),
        body: bookingBody(trip.id, { discount_code: 'WALKIN', source: 'walk_in', amount_paid: 150 }),
      }),
    );
    expect(res.status).toBe(201);
    const booking = (await res.json()).booking;
    expect(booking.amount).toBe(150);
    expect(booking.status).toBe('CONFIRMED');
    expect(booking.amount_paid).toBe(150);
  });

  it('leaves a booking without a code priced as before', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 180 });
    await createSupplierStorage(supplier._id, { kayak: 5 });
    const res = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: bookingBody(trip.id),
      }),
    );
    const booking = (await res.json()).booking;
    expect(booking.amount).toBe(180);
    expect(booking.discount).toBeFalsy();
    expect(booking.status).toBe('PENDING');
  });

  it('matches validate to the booking total and rate-limits guesses', async () => {
    const { supplier } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id, { price: 1000 });
    await createSupplierStorage(supplier._id, { kayak: 5 });
    await makeCode(tokenOf(admin), {
      code: 'checkme',
      type: 'percentage',
      value: 10,
      expires_at: futureExpiry(),
    });
    const preview = await validateCode(
      jsonRequest('http://localhost/api/v1/discount-codes/validate', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.10' },
        body: {
          code: 'checkme',
          trip_id: trip.id,
          phone_number: '+201012345678',
          local_guests: 1,
          quantity: 1,
        },
      }),
    );
    expect(preview.status).toBe(200);
    expect(await preview.json()).toMatchObject({ subtotal: 1000, discount: 100, total: 900, min_deposit: 450 });

    let limited = 200;
    for (let i = 0; i < 25; i += 1) {
      const res = await validateCode(
        jsonRequest('http://localhost/api/v1/discount-codes/validate', {
          method: 'POST',
          headers: { 'x-forwarded-for': '203.0.113.99' },
          body: { code: 'NOPE', trip_id: trip.id, phone_number: '+201012345678', quantity: 1 },
        }),
      );
      limited = res.status;
      if (limited === 429) break;
    }
    expect(limited).toBe(429);
  });

  it('limits wrong guesses at checkout too, sharing the counter with validate', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 100 });
    await createSupplierStorage(supplier._id, { kayak: 5 });
    const headers = { 'x-forwarded-for': '198.51.100.7' };

    for (let i = 0; i < 9; i += 1) {
      const res = await createManualBooking(
        jsonRequest('http://localhost/api/v1/bookings/manual', {
          method: 'POST',
          headers,
          body: bookingBody(trip.id, { discount_code: `GUESS${i}` }),
        }),
      );
      expect(res.status).toBe(409);
      expect((await res.json()).code).toBe('NOT_FOUND');
    }
    // The 10th wrong guess comes through validate and uses up the shared limit.
    const tenth = await validateCode(
      jsonRequest('http://localhost/api/v1/discount-codes/validate', {
        method: 'POST',
        headers,
        body: { code: 'GUESS9', trip_id: trip.id, phone_number: '+201012345678', quantity: 1 },
      }),
    );
    expect(tenth.status).toBe(409);

    const blocked = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        headers,
        body: bookingBody(trip.id, { discount_code: 'GUESS10' }),
      }),
    );
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).code).toBe('RATE_LIMITED');
    expect(await Booking.countDocuments({ trip_id: trip._id })).toBe(0);

    // A booking without a code is never held back by the guess limit.
    const plain = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        headers,
        body: bookingBody(trip.id),
      }),
    );
    expect(plain.status).toBe(201);
  });

  it('never locks out a customer whose valid code is re-checked many times', async () => {
    const { user, supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 100, max_guests: 10 });
    await makeCode(tokenOf(user), {
      code: 'RECHECK',
      type: 'percentage',
      value: 10,
      expires_at: futureExpiry(),
    });
    for (let guests = 1; guests <= 25; guests += 1) {
      const res = await validateCode(
        jsonRequest('http://localhost/api/v1/discount-codes/validate', {
          method: 'POST',
          headers: { 'x-forwarded-for': '198.51.100.8' },
          body: {
            code: 'RECHECK',
            trip_id: trip.id,
            phone_number: '+201012345678',
            quantity: (guests % 10) + 1,
            local_guests: (guests % 10) + 1,
          },
        }),
      );
      expect(res.status).toBe(200);
    }
  });

  it('asks for a valid phone on a once-per-customer code', async () => {
    const { user, supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 100 });
    await createSupplierStorage(supplier._id, { kayak: 5 });
    await makeCode(tokenOf(user), {
      code: 'ONEPHONE',
      type: 'percentage',
      value: 10,
      once_per_customer: true,
      expires_at: futureExpiry(),
    });
    const res = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: bookingBody(trip.id, { discount_code: 'ONEPHONE', phone_number: '12' }),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('INVALID_PHONE');
    expect((await DiscountCode.findOne({ code: 'ONEPHONE' }))?.used_count).toBe(0);
  });
});
