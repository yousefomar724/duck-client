import { describe, expect, it } from 'vitest';
import { PATCH as updateBooking, DELETE as deleteBooking } from '@/app/api/v1/bookings/[id]/route';
import { POST as supplierCancel } from '@/app/api/v1/bookings/[id]/supplier-cancel/route';
import { POST as adminCancel } from '@/app/api/v1/bookings/[id]/admin-cancel/route';
import { POST as refundSent } from '@/app/api/v1/bookings/[id]/refund-sent/route';
import { POST as manualConfirm } from '@/app/api/v1/bookings/[id]/manual-confirm/route';
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
    expect((await res.json()).booking.refund_owed).toBe(0);
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
});
