import { describe, expect, it } from 'vitest';
import { PUT as setStorage } from '@/app/api/v1/supplier-storage/route';
import { SupplierStorage } from '@/server/models/supplier-storage';
import {
  authHeader,
  createBooking,
  createSupplierStorage,
  createSupplierUser,
  futureBookingDate,
} from '../utils/factories';
import { jsonRequest } from '../utils/http';

function put(userId: string, role: number, body: Record<string, unknown>) {
  return setStorage(
    jsonRequest('http://localhost/api/v1/supplier-storage', {
      method: 'PUT',
      headers: authHeader(userId, role),
      body,
    }),
  );
}

describe('supplier storage merge updates', () => {
  it('preserves omitted resource types and re-clamps maintenance', async () => {
    const { supplier, user } = await createSupplierUser();
    await createSupplierStorage(
      supplier._id,
      { kayak: 9, water_cycle: 5, sup: 3 },
      { maintenance: { kayak: 8, water_cycle: 1, sup: 1 } },
    );

    const response = await put(user.id, user.role, { resources: { kayak: 7 } });
    expect(response.status).toBe(200);
    const storage = await SupplierStorage.findOne({ supplier_id: supplier._id });
    expect(Object.fromEntries(storage!.resources)).toEqual({
      kayak: 7,
      water_cycle: 5,
      sup: 3,
    });
    expect(Object.fromEntries(storage!.maintenance)).toEqual({
      kayak: 7,
      water_cycle: 1,
      sup: 1,
    });
  });

  it('accepts a maintenance-only patch and clamps against stored capacity', async () => {
    const { supplier, user } = await createSupplierUser();
    await createSupplierStorage(supplier._id, { kayak: 4, sup: 2 });
    const response = await put(user.id, user.role, { maintenance: { kayak: 99 } });
    expect(response.status).toBe(200);
    const storage = await SupplierStorage.findOne({ supplier_id: supplier._id });
    expect(storage!.resources.get('sup')).toBe(2);
    expect(storage!.maintenance.get('kayak')).toBe(4);
  });

  it('creates real Map fields on a fresh write', async () => {
    const { supplier, user } = await createSupplierUser();
    const response = await put(user.id, user.role, {
      resources: { kayak: 7 },
      maintenance: { kayak: 2 },
    });
    expect(response.status).toBe(200);
    const storage = await SupplierStorage.findOne({ supplier_id: supplier._id });
    expect(storage!.resources).toBeInstanceOf(Map);
    expect(storage!.resources.get('kayak')).toBe(7);
    expect(storage!.maintenance).toBeInstanceOf(Map);
    expect(storage!.maintenance.get('kayak')).toBe(2);
  });

  it('refuses to remove a type with a future occupying booking', async () => {
    const { supplier, user } = await createSupplierUser();
    await createSupplierStorage(supplier._id, { kayak: 4, sup: 2 });
    await createBooking({
      supplier_id: supplier._id,
      resource_type: 'kayak',
      status: 'CONFIRMED',
      booking_date: futureBookingDate(),
    });

    const response = await put(user.id, user.role, { remove: ['kayak'] });
    expect(response.status).toBe(409);
    const storage = await SupplierStorage.findOne({ supplier_id: supplier._id });
    expect(storage!.resources.has('kayak')).toBe(true);
  });
});
