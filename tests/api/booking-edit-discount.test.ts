import { beforeAll, describe, expect, it, vi } from 'vitest';
import { POST as createManualBooking } from '@/app/api/v1/bookings/manual/route';
import { PATCH as editBooking } from '@/app/api/v1/bookings/[id]/route';
import { POST as manualConfirm } from '@/app/api/v1/bookings/[id]/manual-confirm/route';
import { POST as supplierCancel } from '@/app/api/v1/bookings/[id]/supplier-cancel/route';
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

async function walletAmount(id: unknown) {
  return (await Wallet.findById(id))?.amount ?? 0;
}

async function makeCode(token: string, body: Record<string, unknown>) {
  const res = await createCode(
    jsonRequest('http://localhost/api/v1/discount-codes', {
      method: 'POST',
      token,
      body: { type: 'percentage', value: 10, expires_at: futureExpiry(), ...body },
    }),
  );
  expect(res.status).toBe(201);
  return res.json();
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

async function setup() {
  const { user, supplier, wallet } = await createSupplierUser();
  const { user: admin } = await createAdminUser();
  const trip = await createTrip(supplier._id, { price: 1000, guide_price: 0 });
  await createSupplierStorage(supplier._id, { kayak: 8 });
  return {
    supplier,
    wallet,
    trip,
    supplierToken: tokenOf(user),
    adminToken: tokenOf(admin),
  };
}

describe('discount code on booking edit', () => {
  it('replaces the old one-row-per-booking index when indexes are synced', async () => {
    const collection = DiscountRedemption.collection;
    await collection.dropIndex('booking_id_1');
    await collection.createIndex({ booking_id: 1 }, { unique: true, name: 'booking_id_1' });

    await DiscountRedemption.syncIndexes();

    const index = (await collection.indexes()).find((row) => row.name === 'booking_id_1');
    expect(index?.unique).toBe(true);
    expect(index?.partialFilterExpression).toEqual({ status: 'active' });
  });

  it('lets a supplier apply their own code to a pending booking', async () => {
    const { trip, supplierToken } = await setup();
    const code = await makeCode(supplierToken, { code: 'LATE10' });
    const booking = await book(trip.id);
    expect(booking.amount).toBe(1000);

    const res = await edit(booking.ID, supplierToken, { discount_code: 'late10' });
    expect(res.status).toBe(200);
    const next = (await res.json()).booking;
    expect(next.subtotal).toBe(1000);
    expect(next.amount).toBe(900);
    expect(next.discount).toMatchObject({ code: 'LATE10', amount: 100, funded_by: 'supplier' });

    const redemption = await DiscountRedemption.findOne({ booking_id: booking.ID });
    expect(redemption?.status).toBe('active');
    expect((await DiscountCode.findById(code.id))?.used_count).toBe(1);

    const stored = await Booking.findById(booking.ID);
    const revision = stored!.revisions.at(-1)!;
    expect(revision.changes.get('discount_code')).toMatchObject({ from: null, to: 'LATE10' });
  });

  it('swaps one code for another and keeps the old use as history', async () => {
    const { supplier, trip, supplierToken, adminToken } = await setup();
    const first = await makeCode(supplierToken, { code: 'FIRST10' });
    const second = await makeCode(adminToken, {
      code: 'SECOND20',
      value: 20,
      supplier_id: supplier.id,
    });
    const booking = await book(trip.id, { discount_code: 'FIRST10' });

    const res = await edit(booking.ID, adminToken, { discount_code: 'SECOND20' });
    expect(res.status).toBe(200);
    const next = (await res.json()).booking;
    expect(next.amount).toBe(800);
    expect(next.discount).toMatchObject({ code: 'SECOND20', funded_by: 'platform' });

    expect((await DiscountCode.findById(first.id))?.used_count).toBe(0);
    expect((await DiscountCode.findById(second.id))?.used_count).toBe(1);
    const rows = await DiscountRedemption.find({ booking_id: booking.ID }).sort({ createdAt: 1 });
    expect(rows.map((row) => [row.code_id.toString(), row.status])).toEqual([
      [first.id, 'released'],
      [second.id, 'active'],
    ]);
    expect(rows[0].released_reason).toBe('edit_replaced');
  });

  it('settles the platform credit when a confirmed booking gains or loses a Duck code', async () => {
    const { supplier, wallet, trip, supplierToken, adminToken } = await setup();
    const duck = await makeCode(adminToken, { code: 'DUCKLATE', supplier_id: supplier.id });
    const booking = await book(trip.id);
    expect((await confirm(booking.ID, supplierToken, 1000)).status).toBe(200);
    expect(await walletAmount(wallet._id)).toBe(1000);

    // Adding the code lowers the price below what was paid: the customer is
    // owed 100 back, and Duck covers the same 100 for the supplier.
    const added = await edit(booking.ID, adminToken, { discount_code: 'DUCKLATE' });
    expect(added.status).toBe(200);
    const withCode = (await added.json()).booking;
    expect(withCode.amount).toBe(900);
    expect(withCode.refund_owed).toBe(100);
    expect(withCode.platform_discount_credited).toBe(100);
    expect(await walletAmount(wallet._id)).toBe(1000);

    const removed = await edit(booking.ID, supplierToken, { discount_code: null });
    expect(removed.status).toBe(200);
    const withoutCode = (await removed.json()).booking;
    expect(withoutCode.amount).toBe(1000);
    expect(withoutCode.discount).toBeNull();
    expect(withoutCode.refund_owed).toBe(0);
    expect(withoutCode.platform_discount_credited).toBe(0);
    expect(await walletAmount(wallet._id)).toBe(1000);

    expect((await DiscountCode.findById(duck.id))?.used_count).toBe(0);
    const redemption = await DiscountRedemption.findOne({ booking_id: booking.ID });
    expect(redemption?.status).toBe('released');
    expect(redemption?.released_reason).toBe('edit_removed');
  });

  it('rejects a code checkout would reject and leaves the booking and its code alone', async () => {
    const { trip, supplierToken } = await setup();
    const kept = await makeCode(supplierToken, { code: 'KEEPME' });
    const expired = await makeCode(supplierToken, { code: 'OLDCODE' });
    await DiscountCode.updateOne(
      { _id: expired.id },
      { $set: { expires_at: new Date(Date.now() - 60_000) } },
    );
    const booking = await book(trip.id, { discount_code: 'KEEPME' });

    const res = await edit(booking.ID, supplierToken, { discount_code: 'OLDCODE' });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('EXPIRED');

    const missing = await edit(booking.ID, supplierToken, { discount_code: 'NOPE-NOPE' });
    expect(missing.status).toBe(409);
    expect((await missing.json()).code).toBe('NOT_FOUND');

    const stored = await Booking.findById(booking.ID);
    expect(stored?.amount).toBe(900);
    expect(stored?.discount?.code).toBe('KEEPME');
    expect(stored?.revisions).toHaveLength(0);
    expect((await DiscountCode.findById(kept.id))?.used_count).toBe(1);
    const active = await DiscountRedemption.find({ booking_id: booking.ID, status: 'active' });
    expect(active.map((row) => row.code_id.toString())).toEqual([kept.id]);
  });

  it('gives the old use back when the new code runs out at the last moment', async () => {
    const { trip, supplierToken } = await setup();
    const kept = await makeCode(supplierToken, { code: 'STAYS' });
    const scarce = await makeCode(supplierToken, { code: 'SCARCE', usage_limit_total: 1 });
    const booking = await book(trip.id, { discount_code: 'STAYS' });

    // Pricing sees a free use; another checkout takes it before the atomic claim.
    const claim = vi.spyOn(DiscountCode, 'findOneAndUpdate').mockResolvedValueOnce(null);
    const res = await edit(booking.ID, supplierToken, { discount_code: 'SCARCE' });
    claim.mockRestore();

    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('USAGE_LIMIT_REACHED');
    expect((await DiscountCode.findById(kept.id))?.used_count).toBe(1);
    expect((await DiscountCode.findById(scarce.id))?.used_count).toBe(0);
    expect((await Booking.findById(booking.ID))?.discount?.code).toBe('STAYS');
    const active = await DiscountRedemption.findOne({ booking_id: booking.ID, status: 'active' });
    expect(active?.code_id.toString()).toBe(kept.id);
  });

  it('keeps an expired code when staff retype it', async () => {
    const { trip, supplierToken } = await setup();
    const code = await makeCode(supplierToken, { code: 'RETYPE' });
    const booking = await book(trip.id, { discount_code: 'RETYPE' });
    await DiscountCode.updateOne(
      { _id: code.id },
      { $set: { expires_at: new Date(Date.now() - 60_000) } },
    );

    const res = await edit(booking.ID, supplierToken, {
      discount_code: ' retype ',
      local_guests: 2,
      adults: 2,
      quantity: 2,
    });
    expect(res.status).toBe(200);
    const next = (await res.json()).booking;
    expect(next.amount).toBe(1800);
    expect((await DiscountCode.findById(code.id))?.used_count).toBe(1);
  });

  it("does not let a supplier apply another supplier's code", async () => {
    const { trip, supplierToken } = await setup();
    const other = await createSupplierUser();
    await makeCode(tokenOf(other.user), { code: 'NOTYOURS' });
    const booking = await book(trip.id);

    const res = await edit(booking.ID, supplierToken, { discount_code: 'NOTYOURS' });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('WRONG_SUPPLIER');
  });

  it('refuses to change the code alongside an amount override or on locked pricing', async () => {
    const { trip, supplierToken, adminToken } = await setup();
    await makeCode(supplierToken, { code: 'LOCKED10' });
    const booking = await book(trip.id);

    const both = await edit(booking.ID, adminToken, {
      discount_code: 'LOCKED10',
      amount_override: 500,
    });
    expect(both.status).toBe(400);

    await Booking.updateOne({ _id: booking.ID }, { $set: { pricing_locked: true } });
    const locked = await edit(booking.ID, supplierToken, { discount_code: 'LOCKED10' });
    expect(locked.status).toBe(403);
    expect(await DiscountRedemption.countDocuments({ booking_id: booking.ID })).toBe(0);
  });

  it('releases the swapped-in code when the booking is later cancelled', async () => {
    const { trip, supplierToken } = await setup();
    const first = await makeCode(supplierToken, { code: 'GONE10' });
    const second = await makeCode(supplierToken, { code: 'THEN20', value: 20 });
    const booking = await book(trip.id, { discount_code: 'GONE10' });
    expect((await edit(booking.ID, supplierToken, { discount_code: 'THEN20' })).status).toBe(200);

    const cancelled = await supplierCancel(
      jsonRequest(`http://localhost/api/v1/bookings/${booking.ID}/supplier-cancel`, {
        method: 'POST',
        token: supplierToken,
        body: { reason: 'weather' },
      }),
      { params: Promise.resolve({ id: booking.ID }) },
    );
    expect(cancelled.status).toBe(200);
    expect((await DiscountCode.findById(first.id))?.used_count).toBe(0);
    expect((await DiscountCode.findById(second.id))?.used_count).toBe(0);
    expect(
      await DiscountRedemption.countDocuments({ booking_id: booking.ID, status: 'active' }),
    ).toBe(0);
  });
});
