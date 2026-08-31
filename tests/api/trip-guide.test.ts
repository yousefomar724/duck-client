import { describe, expect, it } from 'vitest';
import { PATCH as updateTrip } from '@/app/api/v1/trips/[id]/route';
import { createSupplierUser, createTrip, authHeader } from '../utils/factories';
import { jsonRequest } from '../utils/http';
import { Trip } from '@/server/models/trip';
import { TourGuide } from '@/server/models/tourguide';

async function patch(tripId: string, user: { id: string; role: number }, body: unknown) {
  return updateTrip(
    jsonRequest(`http://localhost/api/v1/trips/${tripId}`, {
      method: 'PATCH',
      body,
      headers: authHeader(user.id, user.role),
    }),
    { params: Promise.resolve({ id: tripId }) },
  );
}

describe('trip tour guide assignment', () => {
  it('clears the guide when tour_guide_id is sent as null', async () => {
    const { supplier, user } = await createSupplierUser();
    const guide = await TourGuide.create({
      name: 'كابتن DUCK',
      price: 100,
      phone_number: '+201000000001',
    });
    const trip = await createTrip(supplier._id, { tour_guide_id: guide._id });

    expect((await Trip.findById(trip.id))?.tour_guide_id).not.toBeNull();

    // The regression: a truthiness guard treated null as "no change", so a
    // trip kept showing "المرشد: كابتن DUCK" after the guide was removed.
    const res = await patch(trip.id, user, { tour_guide_id: null });
    expect(res.status).toBe(200);

    expect((await Trip.findById(trip.id))?.tour_guide_id).toBeNull();
  });

  it('still assigns a guide when one is given', async () => {
    const { supplier, user } = await createSupplierUser();
    const guide = await TourGuide.create({
      name: 'كابتن آخر',
      price: 150,
      phone_number: '+201000000002',
    });
    const trip = await createTrip(supplier._id);

    const res = await patch(trip.id, user, { tour_guide_id: String(guide._id) });
    expect(res.status).toBe(200);
    expect(String((await Trip.findById(trip.id))?.tour_guide_id)).toBe(String(guide._id));
  });

  it('leaves the guide untouched when the field is omitted', async () => {
    const { supplier, user } = await createSupplierUser();
    const guide = await TourGuide.create({
      name: 'كابتن ثابت',
      price: 120,
      phone_number: '+201000000003',
    });
    const trip = await createTrip(supplier._id, { tour_guide_id: guide._id });

    const res = await patch(trip.id, user, { price: 250 });
    expect(res.status).toBe(200);
    expect(String((await Trip.findById(trip.id))?.tour_guide_id)).toBe(String(guide._id));
  });
});
