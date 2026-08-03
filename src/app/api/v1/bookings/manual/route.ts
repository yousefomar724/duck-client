import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { optionalAuth } from '@/server/auth/guard';
import { Booking } from '@/server/models/booking';
import { Supplier } from '@/server/models/supplier';
import { buildBooking, toBookingEmailData, type CreateBookingInput } from '@/server/services/booking';
import { NoAvailabilityError } from '@/server/services/availability';
import { sendSupplierNewManualBookingEmail } from '@/server/lib/mail';
import { errorResponse } from '@/server/lib/json';

export async function POST(request: Request) {
  await dbConnect();

  // Fixes a Go-API bug (#3): the original booking endpoints had no JWT
  // middleware at all, so `user_id` was always null even for a logged-in
  // caller — `GET /bookings/user` could never return anything. Attaching the
  // session when a valid token is present (without requiring one) fixes
  // that while keeping guest checkout working.
  const session = optionalAuth(request);

  let body: CreateBookingInput;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  try {
    const built = await buildBooking(session?.user_id ?? null, body);
    const booking = await Booking.create(built);

    const populated = await Booking.findById(booking._id)
      .populate({ path: 'trip_id', populate: { path: 'destination_ids' } })
      .populate('user_id')
      .populate('supplier_id');

    // Mirrors the Go handler's `_ = h.EmailService.Send...(...)`: the booking
    // is already committed at this point, so an email failure (bad SMTP
    // creds, a malformed field, transient network error) must never turn a
    // successful booking into a 500 for the caller.
    try {
      const supplier = await Supplier.findById(built.supplier_id);
      if (supplier?.email) {
        await sendSupplierNewManualBookingEmail(supplier.email, toBookingEmailData(populated!));
      }
    } catch (err) {
      console.warn('Failed to send new-manual-booking email', err);
    }

    return NextResponse.json(
      { message: 'Manual booking created and waiting for supplier confirmation.', booking: populated },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof NoAvailabilityError) {
      return errorResponse(409, err.message);
    }
    const message = err instanceof Error ? err.message : 'failed to create booking';
    return errorResponse(500, message);
  }
}
