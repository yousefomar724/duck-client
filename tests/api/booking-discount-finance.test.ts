import { describe, expect, it } from 'vitest';
import { POST as createManualBooking } from '@/app/api/v1/bookings/manual/route';
import { PATCH as editBooking } from '@/app/api/v1/bookings/[id]/route';
import { POST as manualConfirm } from '@/app/api/v1/bookings/[id]/manual-confirm/route';
import { POST as collectBalance } from '@/app/api/v1/bookings/[id]/collect-balance/route';
import { POST as supplierCancel } from '@/app/api/v1/bookings/[id]/supplier-cancel/route';
import { POST as customerCancel } from '@/app/api/v1/bookings/[id]/cancel/route';
import { POST as adminRefund } from '@/app/api/v1/bookings/[id]/refund/route';
import { DELETE as deleteBooking } from '@/app/api/v1/bookings/[id]/route';
import { POST as setStatus } from '@/app/api/v1/bookings/[id]/status/route';
import { POST as createPayout } from '@/app/api/v1/payouts/route';
import { GET as reports } from '@/app/api/v1/reports/overview/route';
import { POST as createCode } from '@/app/api/v1/discount-codes/route';
import { PATCH as patchCode } from '@/app/api/v1/discount-codes/[id]/route';
import {
  authHeader,
  createAdminUser,
  createSupplierStorage,
  createSupplierUser,
  createTrip,
  createUser,
  futureBookingDate,
} from '../utils/factories';
import { jsonRequest } from '../utils/http';
import { Booking } from '@/server/models/booking';
import { DiscountCode } from '@/server/models/discount-code';
import { Wallet } from '@/server/models/wallet';
import { applyBookingStatus } from '@/server/services/booking-status';
import { releaseDiscount } from '@/server/services/discount';

function tokenOf(user: { id: string; role: number }) {
  return authHeader(user.id, user.role).Authorization.replace('Bearer ', '');
}

async function walletAmount(id: unknown) {
  return (await Wallet.findById(id))?.amount ?? 0;
}

describe('discount money paths', () => {
  it('credits the wallet for supplier-funded and platform-funded codes', async () => {
    const { user, supplier, wallet } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id, { price: 1000 });
    await createSupplierStorage(supplier._id, { kayak: 8 });
    const supplierToken = tokenOf(user);
    const adminToken = tokenOf(admin);

    await createCode(
      jsonRequest('http://localhost/api/v1/discount-codes', {
        method: 'POST',
        token: supplierToken,
        body: { code: 'SUP10', type: 'percentage', value: 10, expires_at: new Date(Date.now() + 86_400_000).toISOString() },
      }),
    );
    await createCode(
      jsonRequest('http://localhost/api/v1/discount-codes', {
        method: 'POST',
        token: adminToken,
        body: {
          code: 'DUCK10',
          type: 'percentage',
          value: 10,
          expires_at: new Date(Date.now() + 86_400_000).toISOString(),
          supplier_id: supplier.id,
        },
      }),
    );

    const book = (code: string, phone: string) =>
      createManualBooking(
        jsonRequest('http://localhost/api/v1/bookings/manual', {
          method: 'POST',
          body: {
            trip_id: trip.id,
            full_name: 'Guest',
            phone_number: phone,
            booking_date: futureBookingDate().toISOString(),
            resource_type: 'kayak',
            quantity: 1,
            local_guests: 1,
            adults: 1,
            discount_code: code,
            declared_amount: 450,
          },
        }),
      );

    const supplierBooking = (await (await book('SUP10', '+201010000001')).json()).booking;
    expect(supplierBooking.amount).toBe(900);
    const confirmSupplier = await manualConfirm(
      jsonRequest(`http://localhost/api/v1/bookings/${supplierBooking.ID}/manual-confirm`, {
        method: 'POST',
        token: supplierToken,
        body: { amount_paid: 450 },
      }),
      { params: Promise.resolve({ id: supplierBooking.ID }) },
    );
    expect(confirmSupplier.status).toBe(200);
    expect(await walletAmount(wallet._id)).toBe(450);

    const collected = await collectBalance(
      jsonRequest(`http://localhost/api/v1/bookings/${supplierBooking.ID}/collect-balance`, {
        method: 'POST',
        token: supplierToken,
        body: {},
      }),
      { params: Promise.resolve({ id: supplierBooking.ID }) },
    );
    expect(collected.status).toBe(200);
    expect(await walletAmount(wallet._id)).toBe(900);

    const duckBooking = (await (await book('DUCK10', '+201010000002')).json()).booking;
    await manualConfirm(
      jsonRequest(`http://localhost/api/v1/bookings/${duckBooking.ID}/manual-confirm`, {
        method: 'POST',
        token: supplierToken,
        body: { amount_paid: 900 },
      }),
      { params: Promise.resolve({ id: duckBooking.ID }) },
    );
    expect(await walletAmount(wallet._id)).toBe(900 + 900 + 100);
    const stored = await Booking.findById(duckBooking.ID);
    expect(stored?.platform_discount_credited).toBe(100);
  });

  it('reprices a frozen discount on edit, including after the code is disabled', async () => {
    const { user, supplier, wallet } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id, { price: 1000 });
    await createSupplierStorage(supplier._id, { kayak: 8 });
    const adminToken = tokenOf(admin);
    const createdCode = await createCode(
      jsonRequest('http://localhost/api/v1/discount-codes', {
        method: 'POST',
        token: adminToken,
        body: {
          code: 'EDITME',
          type: 'percentage',
          value: 10,
          expires_at: new Date(Date.now() + 86_400_000).toISOString(),
          supplier_id: supplier.id,
        },
      }),
    );
    const code = await createdCode.json();
    const booked = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Guest',
          phone_number: '+201010000003',
          booking_date: futureBookingDate().toISOString(),
          resource_type: 'kayak',
          quantity: 1,
          local_guests: 1,
          adults: 1,
          discount_code: 'EDITME',
        },
      }),
    );
    const booking = (await booked.json()).booking;
    await manualConfirm(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.ID}/manual-confirm`, {
        method: 'POST',
        token: tokenOf(user),
        body: { amount_paid: 900 },
      }),
      { params: Promise.resolve({ id: booking.ID }) },
    );
    expect(await walletAmount(wallet._id)).toBe(1000);

    await patchCode(
      jsonRequest(`http://localhost/api/v1/discount-codes/${code.id}`, {
        method: 'PATCH',
        token: adminToken,
        body: { status: 'disabled' },
      }),
      { params: Promise.resolve({ id: code.id }) },
    );

    const edited = await editBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.ID}`, {
        method: 'PATCH',
        token: tokenOf(user),
        body: { local_guests: 2, adults: 2, quantity: 2 },
      }),
      { params: Promise.resolve({ id: booking.ID }) },
    );
    expect(edited.status).toBe(200);
    const next = (await edited.json()).booking;
    expect(next.subtotal).toBe(2000);
    expect(next.discount.amount).toBe(200);
    expect(next.amount).toBe(1800);
    expect(next.platform_discount_credited).toBe(200);
    expect(await walletAmount(wallet._id)).toBe(1000 + 100);

    const overridden = await editBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.ID}`, {
        method: 'PATCH',
        token: adminToken,
        body: { amount_override: 1500 },
      }),
      { params: Promise.resolve({ id: booking.ID }) },
    );
    const afterOverride = (await overridden.json()).booking;
    expect(afterOverride.amount).toBe(1500);
    expect(afterOverride.platform_discount_credited).toBe(200);
    expect(afterOverride.discount.code).toBe('EDITME');
  });

  it('reverses a platform credit on refund and keeps it for no-show', async () => {
    const { user: customer } = await createUser();
    const { user, supplier, wallet } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id, { price: 500 });
    await createSupplierStorage(supplier._id, { kayak: 6 });
    await createCode(
      jsonRequest('http://localhost/api/v1/discount-codes', {
        method: 'POST',
        token: tokenOf(admin),
        body: {
          code: 'REFUNDME',
          type: 'fixed',
          value: 100,
          currency: 'EGP',
          expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        },
      }),
    );
    const created = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        token: tokenOf(customer),
        body: {
          trip_id: trip.id,
          full_name: 'Guest',
          phone_number: '+201010000004',
          booking_date: futureBookingDate(24 * 10).toISOString(),
          resource_type: 'kayak',
          quantity: 1,
          local_guests: 1,
          adults: 1,
          discount_code: 'REFUNDME',
        },
      }),
    );
    expect(created.status).toBe(201);
    const booking = (await created.json()).booking;
    expect(booking.amount).toBe(400);
    await manualConfirm(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.ID}/manual-confirm`, {
        method: 'POST',
        token: tokenOf(user),
        body: { amount_paid: 400 },
      }),
      { params: Promise.resolve({ id: booking.ID }) },
    );
    expect(await walletAmount(wallet._id)).toBe(500);

    const cancelled = await customerCancel(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.ID}/cancel`, {
        method: 'POST',
        token: tokenOf(customer),
      }),
      { params: Promise.resolve({ id: booking.ID }) },
    );
    expect(cancelled.status).toBe(200);
    expect((await DiscountCode.findOne({ code: 'REFUNDME' }))?.used_count).toBe(1);

    const refunded = await adminRefund(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.ID}/refund`, {
        method: 'POST',
        token: tokenOf(admin),
      }),
      { params: Promise.resolve({ id: booking.ID }) },
    );
    expect(refunded.status).toBe(200);
    expect(await walletAmount(wallet._id)).toBe(0);
    expect((await Booking.findById(booking.ID))?.platform_discount_credited).toBe(0);
    expect((await DiscountCode.findOne({ code: 'REFUNDME' }))?.used_count).toBe(0);

    const kept = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Stays',
          phone_number: '+201010000005',
          booking_date: futureBookingDate(48).toISOString(),
          resource_type: 'kayak',
          quantity: 1,
          local_guests: 1,
          adults: 1,
          discount_code: 'REFUNDME',
        },
      }),
    );
    const stay = (await kept.json()).booking;
    await manualConfirm(
      jsonRequest(`http://localhost/api/v1/bookings/${stay.ID}/manual-confirm`, {
        method: 'POST',
        token: tokenOf(user),
        body: { amount_paid: 400 },
      }),
      { params: Promise.resolve({ id: stay.ID }) },
    );
    const noshow = await setStatus(
      jsonRequest(`http://localhost/api/v1/bookings/${stay.ID}/status`, {
        method: 'POST',
        token: tokenOf(user),
        body: { status: 'NO_SHOW' },
      }),
      { params: Promise.resolve({ id: stay.ID }) },
    );
    expect(noshow.status).toBe(200);
    expect((await DiscountCode.findOne({ code: 'REFUNDME' }))?.used_count).toBe(1);
    expect((await Booking.findById(stay.ID))?.platform_discount_credited).toBe(100);
    expect(await walletAmount(wallet._id)).toBe(500);
  });

  it('includes the platform credit in an admin delete and allows a full payout', async () => {
    const { user, supplier, wallet } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id, { price: 300 });
    await createSupplierStorage(supplier._id, { kayak: 4 });
    await createCode(
      jsonRequest('http://localhost/api/v1/discount-codes', {
        method: 'POST',
        token: tokenOf(admin),
        body: {
          code: 'ALLDUCK',
          type: 'percentage',
          value: 100,
          expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        },
      }),
    );
    const created = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Free',
          phone_number: '+201010000006',
          booking_date: futureBookingDate().toISOString(),
          resource_type: 'kayak',
          quantity: 1,
          local_guests: 1,
          adults: 1,
          discount_code: 'ALLDUCK',
        },
      }),
    );
    const booking = (await created.json()).booking;
    await manualConfirm(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.ID}/manual-confirm`, {
        method: 'POST',
        token: tokenOf(user),
        body: { amount_paid: 0 },
      }),
      { params: Promise.resolve({ id: booking.ID }) },
    );
    expect(await walletAmount(wallet._id)).toBe(300);

    const payout = await createPayout(
      jsonRequest('http://localhost/api/v1/payouts', {
        method: 'POST',
        token: tokenOf(admin),
        body: { supplier_id: supplier.id, amount: 300, currency: 'EGP', status: 'paid' },
      }),
    );
    expect(payout.status).toBe(201);
    expect(await walletAmount(wallet._id)).toBe(0);

    const second = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Delete Me',
          phone_number: '+201010000007',
          booking_date: futureBookingDate(30).toISOString(),
          resource_type: 'kayak',
          quantity: 1,
          local_guests: 1,
          adults: 1,
          discount_code: 'ALLDUCK',
        },
      }),
    );
    const doomed = (await second.json()).booking;
    await manualConfirm(
      jsonRequest(`http://localhost/api/v1/bookings/${doomed.ID}/manual-confirm`, {
        method: 'POST',
        token: tokenOf(user),
        body: {},
      }),
      { params: Promise.resolve({ id: doomed.ID }) },
    );
    expect(await walletAmount(wallet._id)).toBe(300);
    const removed = await deleteBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${doomed.ID}`, {
        method: 'DELETE',
        token: tokenOf(admin),
      }),
      { params: Promise.resolve({ id: doomed.ID }) },
    );
    expect(removed.status).toBe(200);
    expect((await removed.json()).wallet_adjustment).toBe(-300);
    expect(await walletAmount(wallet._id)).toBe(0);
    expect((await DiscountCode.findOne({ code: 'ALLDUCK' }))?.used_count).toBe(1);

    const pending = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Still pending',
          phone_number: '+201010000008',
          booking_date: futureBookingDate(36).toISOString(),
          resource_type: 'kayak',
          quantity: 1,
          local_guests: 1,
          adults: 1,
          discount_code: 'ALLDUCK',
        },
      }),
    );
    const pendingBooking = await Booking.findById((await pending.json()).booking.ID);
    await supplierCancel(
      jsonRequest('http://localhost/api/v1/bookings/x/supplier-cancel', {
        method: 'POST',
        token: tokenOf(user),
        body: {},
      }),
      { params: Promise.resolve({ id: pendingBooking!.id }) },
    );
    const doc = await Booking.findById(pendingBooking!._id);
    expect(doc?.status).toBe('CANCELLED');
    await releaseDiscount(doc!, 'failed');
    await releaseDiscount(doc!, 'failed');
    expect((await DiscountCode.findOne({ code: 'ALLDUCK' }))?.used_count).toBe(1);
    expect(await walletAmount(wallet._id)).toBe(0);

    const overview = await reports(
      jsonRequest('http://localhost/api/v1/reports/overview?from=2020-01-01&to=2030-01-01', {
        token: tokenOf(admin),
      }),
    );
    expect(overview.status).toBe(200);
    const body = await overview.json();
    expect(body.discount_totals.platform_funded_discounts).toBeGreaterThan(0);
  });

  it('keeps the use and the credit for a completed booking, and FAILED cannot be reached', async () => {
    const { user, supplier, wallet } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 200 });
    await createSupplierStorage(supplier._id, { kayak: 4 });
    const { user: admin } = await createAdminUser();
    await createCode(
      jsonRequest('http://localhost/api/v1/discount-codes', {
        method: 'POST',
        token: tokenOf(admin),
        body: { code: 'DONEIT', type: 'percentage', value: 50, expires_at: new Date(Date.now() + 86_400_000).toISOString() },
      }),
    );
    const created = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Done',
          phone_number: '+201010000009',
          booking_date: futureBookingDate().toISOString(),
          resource_type: 'kayak',
          quantity: 1,
          local_guests: 1,
          adults: 1,
          discount_code: 'DONEIT',
        },
      }),
    );
    const id = (await created.json()).booking.ID;
    await manualConfirm(
      jsonRequest(`http://localhost/api/v1/bookings/${id}/manual-confirm`, {
        method: 'POST',
        token: tokenOf(user),
        body: { amount_paid: 100 },
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(await walletAmount(wallet._id)).toBe(200);

    // The status API has no FAILED option, and no transition leads there.
    const failed = await setStatus(
      jsonRequest(`http://localhost/api/v1/bookings/${id}/status`, {
        method: 'POST',
        token: tokenOf(user),
        body: { status: 'FAILED' },
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(failed.status).toBe(400);
    const confirmed = await Booking.findById(id);
    await expect(
      applyBookingStatus(confirmed!, 'FAILED', { user_id: admin.id, role: 2, supplier_id: null }),
    ).rejects.toThrow(/cannot change status/);

    for (const status of ['ARRIVED', 'IN_PROGRESS', 'COMPLETED']) {
      const res = await setStatus(
        jsonRequest(`http://localhost/api/v1/bookings/${id}/status`, {
          method: 'POST',
          token: tokenOf(user),
          body: { status },
        }),
        { params: Promise.resolve({ id }) },
      );
      expect(res.status).toBe(200);
    }
    const done = await Booking.findById(id);
    expect(done?.status).toBe('COMPLETED');
    expect(done?.platform_discount_credited).toBe(100);
    expect((await DiscountCode.findOne({ code: 'DONEIT' }))?.used_count).toBe(1);
    expect(await walletAmount(wallet._id)).toBe(200);
  });

  it('records a refund owed when an edit drops a discounted total below what was paid', async () => {
    const { user, supplier, wallet } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 100, max_guests: 6 });
    await createSupplierStorage(supplier._id, { kayak: 6 });
    await createCode(
      jsonRequest('http://localhost/api/v1/discount-codes', {
        method: 'POST',
        token: tokenOf(user),
        body: { code: 'SHRINK', type: 'percentage', value: 20, expires_at: new Date(Date.now() + 86_400_000).toISOString() },
      }),
    );
    const created = await createManualBooking(
      jsonRequest('http://localhost/api/v1/bookings/manual', {
        method: 'POST',
        body: {
          trip_id: trip.id,
          full_name: 'Shrink',
          phone_number: '+201010000010',
          booking_date: futureBookingDate().toISOString(),
          resource_type: 'kayak',
          quantity: 3,
          local_guests: 3,
          adults: 3,
          discount_code: 'SHRINK',
        },
      }),
    );
    const booking = (await created.json()).booking;
    expect(booking.amount).toBe(240);
    await manualConfirm(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.ID}/manual-confirm`, {
        method: 'POST',
        token: tokenOf(user),
        body: { amount_paid: 240 },
      }),
      { params: Promise.resolve({ id: booking.ID }) },
    );
    expect(await walletAmount(wallet._id)).toBe(240);

    const edited = await editBooking(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.ID}`, {
        method: 'PATCH',
        token: tokenOf(user),
        body: { quantity: 1, local_guests: 1, adults: 1 },
      }),
      { params: Promise.resolve({ id: booking.ID }) },
    );
    expect(edited.status).toBe(200);
    const doc = await Booking.findById(booking.ID);
    // 1 guest: subtotal 100, 20% off = 80. 240 was paid, so 160 is owed back.
    expect(doc?.subtotal).toBe(100);
    expect(doc?.discount?.amount).toBe(20);
    expect(doc?.amount).toBe(80);
    expect(doc?.refund_owed).toBe(160);
    expect(await walletAmount(wallet._id)).toBe(80);
  });

  it('reports discount totals that add up and only count confirmed bookings', async () => {
    const { user, supplier } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id, { price: 1000 });
    await createSupplierStorage(supplier._id, { kayak: 8 });
    const expires = new Date(Date.now() + 86_400_000).toISOString();
    await createCode(
      jsonRequest('http://localhost/api/v1/discount-codes', {
        method: 'POST',
        token: tokenOf(user),
        body: { code: 'OWN10', type: 'percentage', value: 10, expires_at: expires },
      }),
    );
    await createCode(
      jsonRequest('http://localhost/api/v1/discount-codes', {
        method: 'POST',
        token: tokenOf(admin),
        body: { code: 'DUCK50', type: 'percentage', value: 50, supplier_id: supplier.id, expires_at: expires },
      }),
    );

    const book = async (code: string, phone: string) => {
      const res = await createManualBooking(
        jsonRequest('http://localhost/api/v1/bookings/manual', {
          method: 'POST',
          body: {
            trip_id: trip.id,
            full_name: 'Report',
            phone_number: phone,
            booking_date: futureBookingDate().toISOString(),
            resource_type: 'kayak',
            quantity: 1,
            local_guests: 1,
            adults: 1,
            discount_code: code,
          },
        }),
      );
      expect(res.status).toBe(201);
      return (await res.json()).booking.ID as string;
    };
    const confirm = (id: string, amount: number) =>
      manualConfirm(
        jsonRequest(`http://localhost/api/v1/bookings/${id}/manual-confirm`, {
          method: 'POST',
          token: tokenOf(user),
          body: { amount_paid: amount },
        }),
        { params: Promise.resolve({ id }) },
      );

    await confirm(await book('OWN10', '+201030000001'), 900);
    await confirm(await book('DUCK50', '+201030000002'), 500);
    // Neither of these has cost anyone anything yet.
    const cancelledId = await book('DUCK50', '+201030000003');
    await supplierCancel(
      jsonRequest(`http://localhost/api/v1/bookings/${cancelledId}/supplier-cancel`, {
        method: 'POST',
        token: tokenOf(user),
        body: { reason: 'weather' },
      }),
      { params: Promise.resolve({ id: cancelledId }) },
    );
    await book('OWN10', '+201030000004');

    const overview = await reports(
      jsonRequest(
        `http://localhost/api/v1/reports/overview?from=2020-01-01&to=2035-01-01&supplier_id=${supplier.id}`,
        { token: tokenOf(admin) },
      ),
    );
    expect(overview.status).toBe(200);
    const body = await overview.json();
    const totals = body.discount_totals;
    expect(totals).toEqual({
      gross: 2000,
      supplier_funded_discounts: 100,
      platform_funded_discounts: 500,
      platform_discount_credited: 500,
      customer_revenue: 1400,
      supplier_earnings: 1900,
    });
    expect(totals.gross - totals.supplier_funded_discounts - totals.platform_funded_discounts).toBe(
      totals.customer_revenue,
    );
    expect(body.discount_codes).toEqual(
      expect.arrayContaining([
        { code: 'DUCK50', funded_by: 'platform', uses: 1, discount_given: 500, revenue: 500 },
        { code: 'OWN10', funded_by: 'supplier', uses: 1, discount_given: 100, revenue: 900 },
      ]),
    );
  });
});
