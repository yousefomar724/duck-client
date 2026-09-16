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
import { Trip } from '@/server/models/trip';
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

  it('filters inactive and booking-state trips for public and management queries', async () => {
    const { supplier, user } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const available = await createTrip(supplier._id, {
      name: { en: 'Available Trip', ar: 'رحلة متاحة' },
      public_status: 'available',
    });
    const comingSoon = await createTrip(supplier._id, {
      name: { en: 'Coming Soon Trip', ar: 'رحلة قريباً' },
      public_status: 'coming-soon',
    });
    const inactive = await createTrip(supplier._id, {
      name: { en: 'Inactive Trip', ar: 'رحلة مخفية' },
      status: 'inactive',
    });
    const legacy = await createTrip(supplier._id, {
      name: { en: 'Legacy Available Trip', ar: 'رحلة قديمة متاحة' },
    });
    await Trip.collection.updateOne(
      { _id: legacy._id },
      { $unset: { status: '', public_status: '', min_guests: '' } },
    );

    const publicRes = await getTrips(
      new Request('http://localhost/api/v1/trips?lang=en'),
    );
    const publicIds = (await publicRes.json()).map((trip: { id: string }) => trip.id);
    expect(publicIds).toContain(available.id);
    expect(publicIds).toContain(comingSoon.id);
    expect(publicIds).not.toContain(inactive.id);

    const availableRes = await getTrips(
      new Request('http://localhost/api/v1/trips?public_status=available'),
    );
    const availableIds = (await availableRes.json()).map(
      (trip: { id: string }) => trip.id,
    );
    expect(availableIds).toContain(available.id);
    expect(availableIds).toContain(legacy.id);
    expect(availableIds).not.toContain(comingSoon.id);
    expect(availableIds).not.toContain(inactive.id);

    const adminRes = await getTrips(
      new Request('http://localhost/api/v1/trips?include_inactive=true', {
        headers: authHeader(admin.id, admin.role),
      }),
    );
    const adminIds = (await adminRes.json()).map((trip: { id: string }) => trip.id);
    expect(adminIds).toContain(inactive.id);

    const supplierRes = await getMyTrips(
      new Request('http://localhost/api/v1/trips/my-trips', {
        headers: authHeader(user.id, user.role),
      }),
    );
    const supplierIds = (await supplierRes.json()).map(
      (trip: { id: string }) => trip.id,
    );
    expect(supplierIds).toContain(inactive.id);

    const publicDetail = await getTrip(
      new Request(`http://localhost/api/v1/trips/${inactive.id}`),
      { params: Promise.resolve({ id: inactive.id }) },
    );
    expect(publicDetail.status).toBe(404);

    const ownerDetail = await getTrip(
      new Request(`http://localhost/api/v1/trips/${inactive.id}`, {
        headers: authHeader(user.id, user.role),
      }),
      { params: Promise.resolve({ id: inactive.id }) },
    );
    expect(ownerDetail.status).toBe(200);
  });

  it('enforces trip minimum defaults and min/max validation', async () => {
    const { supplier, user } = await createSupplierUser();
    const trip = await createTrip(supplier._id, {
      status: undefined,
      public_status: undefined,
      min_guests: undefined,
    });
    expect(trip.status).toBe('active');
    expect(trip.public_status).toBe('available');
    expect(trip.min_guests).toBe(1);

    await expect(
      createTrip(supplier._id, { min_guests: 5, max_guests: 4 }),
    ).rejects.toThrow('min_guests cannot exceed max_guests');

    const patchRes = await updateTrip(
      jsonRequest(`http://localhost/api/v1/trips/${trip.id}`, {
        method: 'PATCH',
        body: { min_guests: 11 },
        headers: authHeader(user.id, user.role),
      }),
      { params: Promise.resolve({ id: trip.id }) },
    );
    expect(patchRes.status).toBe(400);
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
