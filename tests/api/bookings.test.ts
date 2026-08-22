import { describe, expect, it } from 'vitest';
import { POST as createManualBooking } from '@/app/api/v1/bookings/manual/route';
import { POST as cancelBooking } from '@/app/api/v1/bookings/[id]/cancel/route';
import { POST as adminCancelBooking } from '@/app/api/v1/bookings/[id]/admin-cancel/route';
import { POST as refundBooking } from '@/app/api/v1/bookings/[id]/refund/route';
import { POST as manualConfirm } from '@/app/api/v1/bookings/[id]/manual-confirm/route';
import { POST as manualRefund } from '@/app/api/v1/bookings/[id]/manual-refund/route';
import { POST as collectBalance } from '@/app/api/v1/bookings/[id]/collect-balance/route';
import { GET as getWallet } from '@/app/api/v1/wallet/[user_id]/route';
import { GET as listPayouts, POST as createPayout } from '@/app/api/v1/payouts/route';
import { GET as releaseBookings } from '@/app/api/v1/cron/release-bookings/route';
import {
  createSupplierUser,
  createAdminUser,
  createUser,
  createTrip,
  createSupplierStorage,
  createBooking,
  futureBookingDate,
  authHeader,
} from '../utils/factories';
import { jsonRequest } from '../utils/http';
import { Booking } from '@/server/models/booking';
import { Wallet } from '@/server/models/wallet';

describe('booking lifecycle routes', () => {
  it('creates manual booking as guest', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    await createSupplierStorage(supplier._id, { kayak: 5 });

    const res = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Guest User',
          phone_number: '+201012345678',
          booking_date: futureBookingDate().toISOString(),
          resource_type: 'kayak',
          quantity: 1,
          local_guests: 1,
        },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.booking).toBeTruthy();
  });

  it('returns 409 when no availability', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    await createSupplierStorage(supplier._id, { kayak: 0 });

    const res = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Guest User',
          phone_number: '+201012345678',
          booking_date: futureBookingDate().toISOString(),
          resource_type: 'kayak',
          quantity: 1,
        },
      }),
    );
    expect(res.status).toBe(409);
  });

  it('enforces 24h cancel rule and allows admin refund flow', async () => {
    const { supplier, user: supplierUser, wallet } = await createSupplierUser();
    const { user } = await createUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id);

    const soonBooking = await createBooking({
      user_id: user._id,
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      booking_date: new Date(Date.now() + 12 * 60 * 60 * 1000),
      amount: 180,
    });

    const tooLateRes = await cancelBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${soonBooking.id}/cancel`, {
        method: 'POST',
        headers: authHeader(user.id, user.role),
      }),
      { params: Promise.resolve({ id: soonBooking.id }) },
    );
    expect(tooLateRes.status).toBe(400);

    const farBooking = await createBooking({
      user_id: user._id,
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      booking_date: new Date(Date.now() + 72 * 60 * 60 * 1000),
      amount: 180,
    });

    const cancelRes = await cancelBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${farBooking.id}/cancel`, {
        method: 'POST',
        headers: authHeader(user.id, user.role),
      }),
      { params: Promise.resolve({ id: farBooking.id }) },
    );
    expect(cancelRes.status).toBe(200);

    const refundRes = await refundBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${farBooking.id}/refund`, {
        method: 'POST',
        headers: authHeader(admin.id, admin.role),
      }),
      { params: Promise.resolve({ id: farBooking.id }) },
    );
    expect(refundRes.status).toBe(200);

    const pendingBooking = await createBooking({
      user_id: user._id,
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'PENDING',
      booking_date: new Date(Date.now() + 72 * 60 * 60 * 1000),
      amount: 180,
    });

    wallet.amount = 0;
    await Wallet.updateOne({ _id: wallet._id }, { amount: 0 });

    const confirmRes = await manualConfirm(
      jsonRequest(`http://localhost/api/v1/bookings/${pendingBooking.id}/manual-confirm`, {
        method: 'POST',
        headers: authHeader(supplierUser.id, supplierUser.role),
      }),
      { params: Promise.resolve({ id: pendingBooking.id }) },
    );
    expect(confirmRes.status).toBe(200);

    const updatedWallet = await Wallet.findById(wallet._id);
    expect(updatedWallet?.amount).toBe(180);

    const confirmedBooking = await createBooking({
      user_id: user._id,
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      booking_date: new Date(Date.now() + 72 * 60 * 60 * 1000),
      amount: 100,
    });

    const manualRefundRes = await manualRefund(
      jsonRequest(`http://localhost/api/v1/bookings/${confirmedBooking.id}/manual-refund`, {
        method: 'POST',
        headers: authHeader(supplierUser.id, supplierUser.role),
      }),
      { params: Promise.resolve({ id: confirmedBooking.id }) },
    );
    expect(manualRefundRes.status).toBe(200);
  });

  it('cancel rejects a booking owned by another user', async () => {
    const { supplier } = await createSupplierUser();
    const { user: owner } = await createUser();
    const { user: attacker } = await createUser({
      email: 'attacker@test.com',
      username: 'attacker',
    });
    const trip = await createTrip(supplier._id);

    const booking = await createBooking({
      user_id: owner._id,
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      booking_date: new Date(Date.now() + 72 * 60 * 60 * 1000),
    });

    const res = await cancelBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: authHeader(attacker.id, attacker.role),
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(res.status).toBe(403);

    const untouched = await Booking.findById(booking.id);
    expect(untouched?.status).toBe('CONFIRMED');
  });

  it('cancel rejects guest bookings that have no owner', async () => {
    const { supplier } = await createSupplierUser();
    const { user } = await createUser();
    const trip = await createTrip(supplier._id);

    const guestBooking = await createBooking({
      user_id: null,
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      booking_date: new Date(Date.now() + 72 * 60 * 60 * 1000),
    });

    const res = await cancelBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${guestBooking.id}/cancel`, {
        method: 'POST',
        headers: authHeader(user.id, user.role),
      }),
      { params: Promise.resolve({ id: guestBooking.id }) },
    );
    expect(res.status).toBe(403);
  });

  it('wallet GET is restricted to the owner and admins', async () => {
    const { user: owner, wallet } = await createSupplierUser();
    const { user: other } = await createUser({ email: 'other@test.com', username: 'otheruser' });
    const { user: admin } = await createAdminUser();

    const ownerRes = await getWallet(
      jsonRequest(`http://localhost/api/v1/wallet/${owner.id}`, {
        headers: authHeader(owner.id, owner.role),
      }),
      { params: Promise.resolve({ user_id: owner.id }) },
    );
    expect(ownerRes.status).toBe(200);
    expect((await ownerRes.json()).amount).toBe(wallet.amount);

    const otherRes = await getWallet(
      jsonRequest(`http://localhost/api/v1/wallet/${owner.id}`, {
        headers: authHeader(other.id, other.role),
      }),
      { params: Promise.resolve({ user_id: owner.id }) },
    );
    expect(otherRes.status).toBe(403);

    const adminRes = await getWallet(
      jsonRequest(`http://localhost/api/v1/wallet/${owner.id}`, {
        headers: authHeader(admin.id, admin.role),
      }),
      { params: Promise.resolve({ user_id: owner.id }) },
    );
    expect(adminRes.status).toBe(200);
  });

  it('admin manages payouts', async () => {
    const { supplier } = await createSupplierUser();
    const { user: admin } = await createAdminUser();

    const listRes = await listPayouts(
      jsonRequest(`http://localhost/api/v1/payouts?supplier_id=${supplier.id}`, {
        headers: authHeader(admin.id, admin.role),
      }),
    );
    expect(listRes.status).toBe(200);

    const createRes = await createPayout(
      jsonRequest('http://localhost/api/v1/payouts', {
        method: 'POST',
        headers: authHeader(admin.id, admin.role),
        body: {
          supplier_id: supplier.id,
          amount: 50,
          currency: 'EGP',
          status: 'pending',
        },
      }),
    );
    expect(createRes.status).toBe(201);
  });

  it('collect-balance settles a balance on CONFIRMED, COMPLETED, SUCCESS and PAID, but not CANCELLED/REFUNDED', async () => {
    const { supplier, user: supplierUser } = await createSupplierUser();

    for (const status of ['CONFIRMED', 'COMPLETED', 'SUCCESS', 'PAID'] as const) {
      const booking = await createBooking({
        supplier_id: supplier._id,
        status,
        amount: 200,
        amount_paid: 120,
      });

      const res = await collectBalance(
        jsonRequest(`http://localhost/api/v1/bookings/${booking.id}/collect-balance`, {
          method: 'POST',
          headers: authHeader(supplierUser.id, supplierUser.role),
        }),
        { params: Promise.resolve({ id: booking.id }) },
      );
      expect(res.status).toBe(200);

      const updated = await Booking.findById(booking.id);
      expect(updated?.amount_paid).toBe(200);
      // status is left as-is — settling a balance never re-mutates status
      expect(updated?.status).toBe(status);
    }

    for (const status of ['CANCELLED', 'REFUNDED'] as const) {
      const booking = await createBooking({
        supplier_id: supplier._id,
        status,
        amount: 200,
        amount_paid: 0,
      });

      const res = await collectBalance(
        jsonRequest(`http://localhost/api/v1/bookings/${booking.id}/collect-balance`, {
          method: 'POST',
          headers: authHeader(supplierUser.id, supplierUser.role),
        }),
        { params: Promise.resolve({ id: booking.id }) },
      );
      expect(res.status).toBe(400);
    }
  });

  it('manual-refund and admin refund clear refund_owed alongside amount_paid', async () => {
    const { supplier, user: supplierUser } = await createSupplierUser();
    const { user: admin } = await createAdminUser();

    const supplierRefundBooking = await createBooking({
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      amount: 200,
      amount_paid: 100,
      refund_owed: 50,
    });

    const supplierRefundRes = await manualRefund(
      jsonRequest(`http://localhost/api/v1/bookings/${supplierRefundBooking.id}/manual-refund`, {
        method: 'POST',
        headers: authHeader(supplierUser.id, supplierUser.role),
      }),
      { params: Promise.resolve({ id: supplierRefundBooking.id }) },
    );
    expect(supplierRefundRes.status).toBe(200);

    const updatedSupplierRefund = await Booking.findById(supplierRefundBooking.id);
    expect(updatedSupplierRefund?.amount_paid).toBe(0);
    expect(updatedSupplierRefund?.refund_owed).toBe(0);

    const adminRefundBooking = await createBooking({
      supplier_id: supplier._id,
      status: 'REFUND_PENDING',
      amount: 200,
      amount_paid: 100,
      refund_owed: 50,
    });

    const adminRefundRes = await refundBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${adminRefundBooking.id}/refund`, {
        method: 'POST',
        headers: authHeader(admin.id, admin.role),
      }),
      { params: Promise.resolve({ id: adminRefundBooking.id }) },
    );
    expect(adminRefundRes.status).toBe(200);

    const updatedAdminRefund = await Booking.findById(adminRefundBooking.id);
    expect(updatedAdminRefund?.amount_paid).toBe(0);
    expect(updatedAdminRefund?.refund_owed).toBe(0);
  });

  it('a wallet failure leaves the booking untouched (wallet is credited before save)', async () => {
    const { supplier, user: supplierUser, wallet } = await createSupplierUser();
    await Wallet.deleteOne({ _id: wallet._id });

    const booking = await createBooking({
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      amount: 200,
      amount_paid: 100,
    });

    const res = await collectBalance(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.id}/collect-balance`, {
        method: 'POST',
        headers: authHeader(supplierUser.id, supplierUser.role),
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(res.status).toBe(500);

    const untouched = await Booking.findById(booking.id);
    expect(untouched?.amount_paid).toBe(100);
  });

  it('cron release-bookings checks CRON_SECRET', async () => {
    const badRes = await releaseBookings(
      jsonRequest('http://localhost/api/v1/cron/release-bookings'),
    );
    expect(badRes.status).toBe(401);

    const goodRes = await releaseBookings(
      jsonRequest('http://localhost/api/v1/cron/release-bookings', {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      }),
    );
    expect(goodRes.status).toBe(200);
  });
});
