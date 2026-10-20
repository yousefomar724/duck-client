import { describe, expect, it } from 'vitest';
import { POST as createCode, GET as listCodes } from '@/app/api/v1/discount-codes/route';
import { PATCH as patchCode, DELETE as deleteCode } from '@/app/api/v1/discount-codes/[id]/route';
import { GET as listRedemptions } from '@/app/api/v1/discount-codes/[id]/redemptions/route';
import { POST as createManualBooking } from '@/app/api/v1/bookings/manual/route';
import {
  createSupplierUser,
  createAdminUser,
  createUser,
  createTrip,
  authHeader,
  createSupplierStorage,
  futureBookingDate,
} from '../utils/factories';
import { jsonRequest } from '../utils/http';
import { DiscountCode } from '@/server/models/discount-code';

const future = () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

async function postCode(token: string, body: Record<string, unknown>) {
  return createCode(
    jsonRequest('http://localhost/api/v1/discount-codes', {
      method: 'POST',
      token,
      body,
    }),
  );
}

describe('discount code management', () => {
  it('forces supplier ownership and funding even if the body says otherwise', async () => {
    const { user, supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    const other = await createSupplierUser();
    const token = authHeader(user.id, user.role).Authorization.replace('Bearer ', '');

    const res = await postCode(token, {
      code: 'supplier10',
      type: 'percentage',
      value: 10,
      expires_at: future(),
      supplier_id: other.supplier.id,
      funded_by: 'platform',
      trip_ids: [trip.id],
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.supplier_id).toBe(supplier.id);
    expect(body.funded_by).toBe('supplier');
  });

  it('rejects a trip that belongs to another supplier', async () => {
    const { user } = await createSupplierUser();
    const other = await createSupplierUser();
    const trip = await createTrip(other.supplier._id);
    const token = authHeader(user.id, user.role).Authorization.replace('Bearer ', '');
    const res = await postCode(token, {
      code: 'notmine',
      type: 'percentage',
      value: 10,
      expires_at: future(),
      trip_ids: [trip.id],
    });
    expect(res.status).toBe(403);
  });

  it('lets a supplier read but not edit an admin code aimed at them', async () => {
    const { user, supplier } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const adminToken = authHeader(admin.id, admin.role).Authorization.replace('Bearer ', '');
    const created = await postCode(adminToken, {
      code: 'duck20',
      type: 'percentage',
      value: 20,
      expires_at: future(),
      supplier_id: supplier.id,
    });
    expect(created.status).toBe(201);
    const code = await created.json();
    expect(code.funded_by).toBe('platform');

    const supplierToken = authHeader(user.id, user.role).Authorization.replace('Bearer ', '');
    const list = await listCodes(
      jsonRequest('http://localhost/api/v1/discount-codes', { token: supplierToken }),
    );
    const rows = await list.json();
    expect(rows.some((row: { code: string; read_only: boolean }) => row.code === 'DUCK20' && row.read_only)).toBe(true);

    const patch = await patchCode(
      jsonRequest(`http://localhost/api/v1/discount-codes/${code.id}`, {
        method: 'PATCH',
        token: supplierToken,
        body: { description: 'nope' },
      }),
      { params: Promise.resolve({ id: code.id }) },
    );
    expect(patch.status).toBe(403);
  });

  it('rejects customers and anonymous callers', async () => {
    const { user } = await createUser();
    const token = authHeader(user.id, user.role).Authorization.replace('Bearer ', '');
    const authed = await postCode(token, {
      code: 'guest',
      type: 'percentage',
      value: 10,
      expires_at: future(),
    });
    expect(authed.status).toBe(403);
    const anon = await listCodes(jsonRequest('http://localhost/api/v1/discount-codes'));
    expect(anon.status).toBe(401);
  });

  it('rejects a duplicate code that differs only by case', async () => {
    const { user: admin } = await createAdminUser();
    const token = authHeader(admin.id, admin.role).Authorization.replace('Bearer ', '');
    const first = await postCode(token, {
      code: 'Summer10',
      type: 'percentage',
      value: 10,
      expires_at: future(),
    });
    expect(first.status).toBe(201);
    const second = await postCode(token, {
      code: 'summer10',
      type: 'percentage',
      value: 15,
      expires_at: future(),
    });
    expect(second.status).toBe(409);
  });

  it('rejects invalid values and a fixed code without currency', async () => {
    const { user: admin } = await createAdminUser();
    const token = authHeader(admin.id, admin.role).Authorization.replace('Bearer ', '');
    for (const value of [0, 101, -5]) {
      const res = await postCode(token, {
        code: `bad${value}`,
        type: 'percentage',
        value,
        expires_at: future(),
      });
      expect(res.status).toBe(400);
    }
    const fixed = await postCode(token, {
      code: 'fixednocurrency',
      type: 'fixed',
      value: 50,
      expires_at: future(),
    });
    expect(fixed.status).toBe(400);
    const percent = await postCode(token, {
      code: 'percentcur',
      type: 'percentage',
      value: 10,
      currency: 'USD',
      expires_at: future(),
    });
    expect(percent.status).toBe(201);
    expect((await percent.json()).currency).toBe('');
    const past = await postCode(token, {
      code: 'alreadygone',
      type: 'percentage',
      value: 10,
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(past.status).toBe(400);
  });

  it('locks pricing fields after use and soft-deletes only unused codes', async () => {
    const { user: admin } = await createAdminUser();
    const token = authHeader(admin.id, admin.role).Authorization.replace('Bearer ', '');
    const created = await postCode(token, {
      code: 'usedonce',
      type: 'percentage',
      value: 10,
      expires_at: future(),
    });
    const code = await created.json();
    await DiscountCode.updateOne({ _id: code.id }, { $set: { used_count: 1 } });

    const locked = await patchCode(
      jsonRequest(`http://localhost/api/v1/discount-codes/${code.id}`, {
        method: 'PATCH',
        token,
        body: { value: 20 },
      }),
      { params: Promise.resolve({ id: code.id }) },
    );
    expect(locked.status).toBe(400);

    const expiry = await patchCode(
      jsonRequest(`http://localhost/api/v1/discount-codes/${code.id}`, {
        method: 'PATCH',
        token,
        body: { expires_at: future(), usage_limit_total: 5 },
      }),
      { params: Promise.resolve({ id: code.id }) },
    );
    expect(expiry.status).toBe(200);

    const tooLow = await patchCode(
      jsonRequest(`http://localhost/api/v1/discount-codes/${code.id}`, {
        method: 'PATCH',
        token,
        body: { usage_limit_total: 0 },
      }),
      { params: Promise.resolve({ id: code.id }) },
    );
    expect(tooLow.status).toBe(400);

    const disabled = await deleteCode(
      jsonRequest(`http://localhost/api/v1/discount-codes/${code.id}`, { method: 'DELETE', token }),
      { params: Promise.resolve({ id: code.id }) },
    );
    expect(disabled.status).toBe(200);
    expect((await disabled.json()).disabled).toBe(true);

    const fresh = await postCode(token, {
      code: 'neverused',
      type: 'fixed',
      value: 25,
      currency: 'EGP',
      expires_at: future(),
    });
    const unused = await fresh.json();
    const removed = await deleteCode(
      jsonRequest(`http://localhost/api/v1/discount-codes/${unused.id}`, { method: 'DELETE', token }),
      { params: Promise.resolve({ id: unused.id }) },
    );
    expect((await removed.json()).deleted).toBe(true);
    expect(await DiscountCode.findById(unused.id)).toBeNull();
  });

  it('shows a supplier only their own customers on a platform-wide code', async () => {
    const { user: admin } = await createAdminUser();
    const adminToken = authHeader(admin.id, admin.role).Authorization.replace('Bearer ', '');
    const a = await createSupplierUser();
    const b = await createSupplierUser();
    const tripA = await createTrip(a.supplier._id, { price: 100 });
    const tripB = await createTrip(b.supplier._id, { price: 100 });
    await createSupplierStorage(a.supplier._id, { kayak: 4 });
    await createSupplierStorage(b.supplier._id, { kayak: 4 });
    const code = await (
      await postCode(adminToken, { code: 'EVERYONE', type: 'percentage', value: 10, expires_at: future() })
    ).json();

    const book = (tripId: string, name: string, phone: string) =>
      createManualBooking(
        jsonRequest('http://localhost/api/v1/bookings/manual', {
          method: 'POST',
          body: {
            trip_id: tripId,
            full_name: name,
            phone_number: phone,
            booking_date: futureBookingDate().toISOString(),
            resource_type: 'kayak',
            quantity: 1,
            local_guests: 1,
            adults: 1,
            discount_code: 'EVERYONE',
          },
        }),
      );
    expect((await book(tripA.id, 'Customer Of A', '+201011111111')).status).toBe(201);
    expect((await book(tripB.id, 'Customer Of B', '+201022222222')).status).toBe(201);

    const readAs = async (userId: string, role: number) => {
      const token = authHeader(userId, role).Authorization.replace('Bearer ', '');
      const res = await listRedemptions(
        jsonRequest(`http://localhost/api/v1/discount-codes/${code.id}/redemptions`, { token }),
        { params: Promise.resolve({ id: code.id }) },
      );
      expect(res.status).toBe(200);
      return (await res.json()) as { customer_key: string; booking: { full_name: string } | null }[];
    };

    const seenByB = await readAs(b.user.id, b.user.role);
    expect(seenByB.map((row) => row.booking?.full_name)).toEqual(['Customer Of B']);
    expect(JSON.stringify(seenByB)).not.toContain('+201011111111');

    const seenByAdmin = await readAs(admin.id, admin.role);
    expect(seenByAdmin).toHaveLength(2);

    // The list's pending count is per supplier too.
    const listed = await listCodes(
      jsonRequest('http://localhost/api/v1/discount-codes', {
        token: authHeader(b.user.id, b.user.role).Authorization.replace('Bearer ', ''),
      }),
    );
    const row = ((await listed.json()) as { code: string; pending_uses: number }[]).find(
      (item) => item.code === 'EVERYONE',
    );
    expect(row?.pending_uses).toBe(1);
  });

  it('rejects a malformed or unknown supplier and trips that do not match a new supplier', async () => {
    const { user: admin } = await createAdminUser();
    const token = authHeader(admin.id, admin.role).Authorization.replace('Bearer ', '');
    const base = { type: 'percentage', value: 10, expires_at: future() };

    expect((await postCode(token, { ...base, code: 'BADSUP', supplier_id: 'not-an-id' })).status).toBe(400);
    expect(
      (await postCode(token, { ...base, code: 'GONESUP', supplier_id: '64b000000000000000000000' })).status,
    ).toBe(400);
    expect((await postCode(token, { ...base, code: 'BADTRIP', trip_ids: ['nope'] })).status).toBe(400);

    const a = await createSupplierUser();
    const b = await createSupplierUser();
    const tripA = await createTrip(a.supplier._id);
    const created = await (
      await postCode(token, { ...base, code: 'MOVEME', supplier_id: a.supplier.id, trip_ids: [tripA.id] })
    ).json();

    const patch = (body: Record<string, unknown>) =>
      patchCode(
        jsonRequest(`http://localhost/api/v1/discount-codes/${created.id}`, { method: 'PATCH', token, body }),
        { params: Promise.resolve({ id: created.id }) },
      );
    // Moving to supplier B while keeping supplier A's trip is rejected.
    expect((await patch({ supplier_id: b.supplier.id })).status).toBe(403);
    expect((await DiscountCode.findById(created.id))?.supplier_id?.toString()).toBe(a.supplier.id);
    // Moving together with a matching (empty) trip list is fine.
    expect((await patch({ supplier_id: b.supplier.id, trip_ids: [] })).status).toBe(200);
    expect((await patch({ supplier_id: 'not-an-id' })).status).toBe(400);
  });

  it('lets an expired code be edited when its expiry is sent back unchanged', async () => {
    const { user: admin } = await createAdminUser();
    const token = authHeader(admin.id, admin.role).Authorization.replace('Bearer ', '');
    const created = await (
      await postCode(token, { code: 'OLDONE', type: 'percentage', value: 10, expires_at: future() })
    ).json();
    const past = new Date(Date.now() - 60 * 60 * 1000);
    past.setSeconds(42, 123);
    await DiscountCode.updateOne({ _id: created.id }, { $set: { expires_at: past } });

    const patch = (body: Record<string, unknown>) =>
      patchCode(
        jsonRequest(`http://localhost/api/v1/discount-codes/${created.id}`, { method: 'PATCH', token, body }),
        { params: Promise.resolve({ id: created.id }) },
      );

    // The form sends the expiry at minute precision, seconds dropped.
    const sameMinute = new Date(past);
    sameMinute.setSeconds(0, 0);
    const kept = await patch({ description: 'Ramadan', expires_at: sameMinute.toISOString() });
    expect(kept.status).toBe(200);
    const doc = await DiscountCode.findById(created.id);
    expect(doc?.description).toBe('Ramadan');
    expect(doc?.expires_at.getTime()).toBe(past.getTime());

    const otherPast = new Date(past.getTime() - 24 * 60 * 60 * 1000).toISOString();
    expect((await patch({ expires_at: otherPast })).status).toBe(400);
  });
});
