import { describe, expect, it } from 'vitest';
import { GET as getTrips, POST as postTrip } from '@/app/api/v1/trips/route';
import { GET as getTrip, PATCH as updateTrip, DELETE as deleteTrip } from '@/app/api/v1/trips/[id]/route';
import { GET as getMyTrips } from '@/app/api/v1/trips/my-trips/route';
import { GET as getDestinations, POST as postDestination } from '@/app/api/v1/destinations/route';
import { GET as getSuppliers } from '@/app/api/v1/suppliers/route';
import { GET as getTourGuides, POST as postTourGuide } from '@/app/api/v1/tour-guides/route';
import { GET as getStorageHyphen } from '@/app/api/v1/supplier-storage/[supplier_id]/route';
import { GET as getStorageUnderscore } from '@/app/api/v1/supplier_storage/[supplier_id]/route';
import { PUT as setStorageHyphen } from '@/app/api/v1/supplier-storage/route';
import {
  createSupplierUser,
  createAdminUser,
  createDestination,
  createTrip,
  createSupplierStorage,
  createTourGuide,
  authHeader,
} from '../utils/factories';
import { jsonRequest } from '../utils/http';

describe('catalog routes', () => {
  it('lists and creates trips', async () => {
    const { supplier, user } = await createSupplierUser();
    const destination = await createDestination();
    const trip = await createTrip(supplier._id, { destination_ids: [destination._id] });

    const listRes = await getTrips(new Request('http://localhost/api/v1/trips'));
    expect(listRes.status).toBe(200);
    const trips = await listRes.json();
    expect(trips.length).toBeGreaterThanOrEqual(1);

    const getRes = await getTrip(
      new Request(`http://localhost/api/v1/trips/${trip.id}`),
      { params: Promise.resolve({ id: trip.id }) },
    );
    expect(getRes.status).toBe(200);

    const patchRes = await updateTrip(
      jsonRequest(`http://localhost/api/v1/trips/${trip.id}`, {
        method: 'PATCH',
        body: { price: 200 },
        headers: authHeader(user.id, user.role),
      }),
      { params: Promise.resolve({ id: trip.id }) },
    );
    expect(patchRes.status).toBe(200);

    const myTripsRes = await getMyTrips(
      jsonRequest('http://localhost/api/v1/trips/my-trips', {
        headers: authHeader(user.id, user.role),
      }),
    );
    expect(myTripsRes.status).toBe(200);

    const deleteRes = await deleteTrip(
      jsonRequest(`http://localhost/api/v1/trips/${trip.id}`, {
        method: 'DELETE',
        headers: authHeader(user.id, user.role),
      }),
      { params: Promise.resolve({ id: trip.id }) },
    );
    expect(deleteRes.status).toBe(200);
  });

  it('admin creates destination and tour guide', async () => {
    const { user: admin } = await createAdminUser();

    const destRes = await postDestination(
      jsonRequest('http://localhost/api/v1/destinations', {
        method: 'POST',
        headers: authHeader(admin.id, admin.role),
        body: {
          name: { en: 'New Dest', ar: 'وجهة' },
          description: { en: 'Desc', ar: 'وصف' },
          status: 'active',
          lat: 24,
          lng: 32,
        },
      }),
    );
    expect(destRes.status).toBe(201);

    const guidesList = await getTourGuides();
    expect(guidesList.status).toBe(200);

    const guideRes = await postTourGuide(
      jsonRequest('http://localhost/api/v1/tour-guides', {
        method: 'POST',
        headers: authHeader(admin.id, admin.role),
        body: { name: 'Guide', price: 0, phone_number: '01100000000' },
      }),
    );
    expect(guideRes.status).toBe(201);
  });

  it('lists suppliers publicly', async () => {
    await createSupplierUser();
    const res = await getSuppliers(new Request('http://localhost/api/v1/suppliers?lang=en'));
    expect(res.status).toBe(200);
    const suppliers = await res.json();
    expect(suppliers.length).toBeGreaterThanOrEqual(1);
  });

  it('supplier storage aliases behave the same', async () => {
    const { supplier, user } = await createSupplierUser();
    await createSupplierStorage(supplier._id);

    const hyphenRes = await getStorageHyphen(
      new Request(`http://localhost/api/v1/supplier-storage/${supplier.id}`),
      { params: Promise.resolve({ supplier_id: supplier.id }) },
    );
    const underscoreRes = await getStorageUnderscore(
      new Request(`http://localhost/api/v1/supplier_storage/${supplier.id}`),
      { params: Promise.resolve({ supplier_id: supplier.id }) },
    );
    expect(hyphenRes.status).toBe(200);
    expect(underscoreRes.status).toBe(200);

    const setRes = await setStorageHyphen(
      jsonRequest('http://localhost/api/v1/supplier-storage', {
        method: 'PUT',
        headers: authHeader(user.id, user.role),
        body: { resources: { kayak: 10, water_cycle: 0, sup: 0 } },
      }),
    );
    expect(setRes.status).toBe(200);
  });
});
