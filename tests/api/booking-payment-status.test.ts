import { describe, expect, it } from 'vitest';
import { POST as paymentStatus } from '@/app/api/v1/bookings/[id]/payment-status/route';
import { createBooking } from '../utils/factories';
import { jsonRequest, parseJson } from '../utils/http';

async function postStatus(bookingId: string, body: unknown) {
  return paymentStatus(
    jsonRequest(`http://localhost/api/v1/bookings/${bookingId}/payment-status`, {
      method: 'POST',
      body,
    }),
    { params: Promise.resolve({ id: bookingId }) },
  );
}

describe('guest booking payment status', () => {
  it('returns the status when the phone number matches', async () => {
    const booking = await createBooking({ status: 'CONFIRMED' });
    const res = await postStatus(booking.id, { phone_number: '+201000000000' });
    expect(res.status).toBe(200);
    expect(await parseJson(res)).toEqual({ status: 'CONFIRMED' });
  });

  it('hides the booking when the phone number does not match', async () => {
    const booking = await createBooking();
    const res = await postStatus(booking.id, { phone_number: '+201111111111' });
    expect(res.status).toBe(404);
    expect(await parseJson(res)).toMatchObject({ code: 'BOOKING_NOT_FOUND' });
  });

  it('rejects malformed requests', async () => {
    const booking = await createBooking();
    expect((await postStatus(booking.id, {})).status).toBe(400);
    expect((await postStatus('not-an-id', { phone_number: '+201000000000' })).status).toBe(404);
  });
});
