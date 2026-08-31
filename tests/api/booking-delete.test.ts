import { describe, expect, it } from 'vitest';
import { DELETE as deleteBooking } from '@/app/api/v1/bookings/[id]/route';
import {
  createSupplierUser,
  createAdminUser,
  createTrip,
  createBooking,
  authHeader,
} from '../utils/factories';
import { jsonRequest, parseJson } from '../utils/http';
import { Booking } from '@/server/models/booking';
import { DeletedBooking } from '@/server/models/deleted-booking';
import { Wallet } from '@/server/models/wallet';

async function del(id: string, actor: { id: string; role: number }) {
  return deleteBooking(
    jsonRequest(`http://localhost/api/v1/bookings/${id}`, {
      method: 'DELETE',
      body: { reason: 'حجز تجريبي' },
      headers: authHeader(actor.id, actor.role),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe('booking deletion', () => {
  it('deletes a void booking and keeps an audit snapshot', async () => {
    const { user: admin } = await createAdminUser();
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    const booking = await createBooking({
      supplier_id: supplier._id,
      trip_id: trip._id,
      status: 'CANCELLED',
      amount: 360,
      amount_paid: 0,
    });

    const res = await del(booking.id, admin);
    expect(res.status).toBe(200);

    expect(await Booking.findById(booking.id)).toBeNull();
    const snapshot = await DeletedBooking.findOne({ original_id: booking._id });
    expect(snapshot).not.toBeNull();
    expect(snapshot?.reason).toBe('حجز تجريبي');
  });

  it('deletes a paid booking and reverses the supplier wallet', async () => {
    const { user: admin } = await createAdminUser();
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    await Wallet.updateOne({ supplier_id: supplier._id }, { $set: { amount: 500 } });
    const booking = await createBooking({
      supplier_id: supplier._id,
      trip_id: trip._id,
      status: 'CONFIRMED',
      amount: 360,
      amount_paid: 360,
    });

    const res = await del(booking.id, admin);
    expect(res.status).toBe(200);
    const body = await parseJson<{ wallet_adjustment: number }>(res);
    expect(body.wallet_adjustment).toBe(-360);

    const wallet = await Wallet.findOne({ supplier_id: supplier._id });
    expect(wallet?.amount).toBe(140);
  });

  // The one genuinely unsafe case: the customer is out on the water, and no
  // audit snapshot puts them back on the schedule.
  it.each(['ARRIVED', 'IN_PROGRESS'])('refuses to delete a %s booking', async (status) => {
    const { user: admin } = await createAdminUser();
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    const booking = await createBooking({
      supplier_id: supplier._id,
      trip_id: trip._id,
      status,
      amount: 360,
      amount_paid: 360,
    });

    const res = await del(booking.id, admin);
    expect(res.status).toBe(409);
    expect(await Booking.findById(booking.id)).not.toBeNull();
  });

  it('allows deletion once an active booking is closed out', async () => {
    const { user: admin } = await createAdminUser();
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    const booking = await createBooking({
      supplier_id: supplier._id,
      trip_id: trip._id,
      status: 'IN_PROGRESS',
      amount: 360,
      amount_paid: 360,
    });

    expect((await del(booking.id, admin)).status).toBe(409);

    await Booking.updateOne({ _id: booking._id }, { $set: { status: 'COMPLETED' } });
    expect((await del(booking.id, admin)).status).toBe(200);
    expect(await Booking.findById(booking.id)).toBeNull();
  });

  it('refuses deletion for a supplier', async () => {
    const { supplier, user } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    const booking = await createBooking({
      supplier_id: supplier._id,
      trip_id: trip._id, status: 'CANCELLED' });

    const res = await del(booking.id, user);
    expect(res.status).toBe(403);
    expect(await Booking.findById(booking.id)).not.toBeNull();
  });
});
