import { NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { dbConnect } from '@/server/db/connect';
import { optionalAuth } from '@/server/auth/guard';
import { Booking } from '@/server/models/booking';
import { Supplier } from '@/server/models/supplier';
import { buildBooking, persistCreatedBooking, toBookingEmailData, type CreateBookingInput } from '@/server/services/booking';
import { NoAvailabilityError } from '@/server/services/availability';
import { confirmBookingPayment } from '@/server/services/booking-payment';
import { sendSupplierNewManualBookingEmail } from '@/server/lib/mail';
import { errorResponse } from '@/server/lib/json';

const manualBookingSchema = z.object({
  trip_id: z.string().min(1),
  full_name: z.string().min(2),
  phone_number: z.string().min(1),
  booking_date: z.string().min(1),
  resource_type: z.enum(['kayak', 'water_cycle', 'sup']).optional(),
  quantity: z.number().int().positive().optional(),
  local_guests: z.number().int().min(0).optional(),
  foreigner_guests: z.number().int().min(0).optional(),
  duration: z.number().int().min(1).optional(),
  wants_guide: z.boolean().optional(),
  played_before: z.boolean().nullable().optional(),
  hear_about_us: z.string().optional(),
  referral_text: z.string().optional(),
  declared_amount: z.number().min(0).optional(),
  adults: z.number().int().min(0).optional(),
  kids_1_6: z.number().int().min(0).optional(),
  kids_7_12: z.number().int().min(0).optional(),
  source: z.enum(['online', 'walk_in']).optional(),
  /** Cash taken at the dock. Walk-ins only; omitted means the full amount. */
  amount_paid: z.number().min(0).optional(),
});

export async function POST(request: Request) {
  await dbConnect();

  // Fixes a Go-API bug (#3): the original booking endpoints had no JWT
  // middleware at all, so `user_id` was always null even for a logged-in
  // caller — `GET /bookings/user` could never return anything. Attaching the
  // session when a valid token is present (without requiring one) fixes
  // that while keeping guest checkout working.
  const session = optionalAuth(request);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  const parsed = manualBookingSchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse(400, 'Invalid input');
  }
  const body = parsed.data as CreateBookingInput;
  if (body.source === 'walk_in') {
    if (!session || (session.role !== 1 && session.role !== 2)) {
      return errorResponse(403, 'walk_in source is restricted to staff');
    }
  } else {
    body.source = 'online';
  }

  try {
    const built = await buildBooking(session?.user_id ?? null, body);
    const booking = await persistCreatedBooking(built);

    // A walk-in is staff admitting someone already standing at the dock, so it
    // is confirmed and settled on the spot. Left as PENDING with amount_paid 0
    // it counted toward no revenue status and no payment total, which is why
    // walk-ins were missing from the dashboard stats.
    const isWalkIn = built.source === 'walk_in';
    if (isWalkIn) {
      const requested = parsed.data.amount_paid;
      const collected = Math.min(
        booking.amount,
        Math.max(0, requested ?? booking.amount),
      );
      await confirmBookingPayment(booking, collected, 'حجز حضوري');
    }

    const populated = await Booking.findById(booking._id)
      .populate({ path: 'trip_id', populate: { path: 'destination_ids' } })
      .populate('user_id')
      .populate('supplier_id');

    // Mirrors the Go handler's `_ = h.EmailService.Send...(...)`: the booking
    // is already committed at this point, so an email failure (bad SMTP
    // creds, a malformed field, transient network error) must never turn a
    // successful booking into a 500 for the caller.
    try {
      // Walk-ins are created and confirmed by staff, so the
      // "awaiting confirmation" notice would be both wrong and noisy.
      const supplier = isWalkIn ? null : await Supplier.findById(built.supplier_id);
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
      return errorResponse(409, err.message, { code: err.code });
    }
    const message = err instanceof Error ? err.message : 'failed to create booking';
    return errorResponse(500, message);
  }
}
