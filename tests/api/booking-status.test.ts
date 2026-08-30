import { describe, expect, it } from 'vitest';
import { POST as changeStatus } from '@/app/api/v1/bookings/[id]/status/route';
import {
  createSupplierUser,
  createAdminUser,
  createTrip,
  createBooking,
  authHeader,
} from '../utils/factories';
import { jsonRequest } from '../utils/http';

async function postStatus(
  bookingId: string,
  status: string,
  userId: string,
  role: number,
) {
  return changeStatus(
    jsonRequest(`http://localhost/api/v1/bookings/${bookingId}/status`, {
      method: 'POST',
      headers: authHeader(userId, role),
      body: { status },
    }),
    { params: Promise.resolve({ id: bookingId }) },
  );
}

describe('booking status transitions', () => {
  it('allows CONFIRMED → ARRIVED → IN_PROGRESS → COMPLETED', async () => {
    const { supplier } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id);
    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
    });

    expect((await postStatus(booking.id, 'ARRIVED', admin.id, admin.role)).status).toBe(200);
    expect((await postStatus(booking.id, 'IN_PROGRESS', admin.id, admin.role)).status).toBe(200);
    expect((await postStatus(booking.id, 'COMPLETED', admin.id, admin.role)).status).toBe(200);
  });

  it('allows PAID and SUCCESS to ARRIVED or NO_SHOW, and ARRIVED to NO_SHOW', async () => {
    const { supplier } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id);

    const paid = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'PAID',
    });
    expect((await postStatus(paid.id, 'ARRIVED', admin.id, admin.role)).status).toBe(200);

    const success = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'SUCCESS',
    });
    expect((await postStatus(success.id, 'NO_SHOW', admin.id, admin.role)).status).toBe(200);

    const arrived = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'ARRIVED',
    });
    expect((await postStatus(arrived.id, 'NO_SHOW', admin.id, admin.role)).status).toBe(200);
  });

  it('rejects illegal transitions with 409 naming the current status', async () => {
    const { supplier } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id);
    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'PENDING',
    });

    const res = await postStatus(booking.id, 'ARRIVED', admin.id, admin.role);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('PENDING');
  });

  it('blocks a supplier from changing another supplier booking', async () => {
    const { supplier } = await createSupplierUser();
    const { user: other } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
    });

    const res = await postStatus(booking.id, 'ARRIVED', other.id, other.role);
    expect(res.status).toBe(403);
  });

  it('lets the owning supplier transition their booking', async () => {
    const { supplier, user: supplierUser } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
    });

    const res = await postStatus(booking.id, 'ARRIVED', supplierUser.id, supplierUser.role);
    expect(res.status).toBe(200);
  });
});
