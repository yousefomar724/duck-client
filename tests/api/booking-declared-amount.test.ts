import { describe, expect, it } from 'vitest';
import { buildBooking } from '@/server/services/booking';
import { createSupplierUser, createTrip } from '../utils/factories';

describe('buildBooking declared_amount clamp', () => {
  it('accepts a declared_amount at or above the 50% minimum deposit', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 200, foreigner_price: 0 });

    const built = await buildBooking(null, {
      trip_id: trip._id.toString(),
      full_name: 'Guest',
      phone_number: '+201000000001',
      booking_date: new Date(Date.now() + 86_400_000).toISOString(),
      local_guests: 1,
      foreigner_guests: 0,
      declared_amount: 100, // exactly 50% of 200
    });

    expect(built.amount).toBe(200);
    expect(built.declared_amount).toBe(100);
    expect(built.amount_paid).toBe(0);
  });

  it('falls back to the full amount when declared_amount is below the minimum deposit', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 200, foreigner_price: 0 });

    const built = await buildBooking(null, {
      trip_id: trip._id.toString(),
      full_name: 'Guest',
      phone_number: '+201000000002',
      booking_date: new Date(Date.now() + 86_400_000).toISOString(),
      local_guests: 1,
      foreigner_guests: 0,
      declared_amount: 10, // well under 50%
    });

    expect(built.declared_amount).toBe(200);
  });

  it('falls back to the full amount when declared_amount exceeds the total', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 200, foreigner_price: 0 });

    const built = await buildBooking(null, {
      trip_id: trip._id.toString(),
      full_name: 'Guest',
      phone_number: '+201000000003',
      booking_date: new Date(Date.now() + 86_400_000).toISOString(),
      local_guests: 1,
      foreigner_guests: 0,
      declared_amount: 999,
    });

    expect(built.declared_amount).toBe(200);
  });

  it('defaults to the full amount when declared_amount is omitted', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id, { price: 200, foreigner_price: 0 });

    const built = await buildBooking(null, {
      trip_id: trip._id.toString(),
      full_name: 'Guest',
      phone_number: '+201000000004',
      booking_date: new Date(Date.now() + 86_400_000).toISOString(),
      local_guests: 1,
      foreigner_guests: 0,
    });

    expect(built.declared_amount).toBe(200);
  });
});
