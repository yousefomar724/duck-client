import { NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { findActiveUserById } from '@/server/services/user';
import { Booking } from '@/server/models/booking';
import {
  applyBookingEdit,
  BookingEditError,
  deleteBookingByAdmin,
} from '@/server/services/booking-edit';
import { errorResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

const editSchema = z.object({
  quantity: z.number().int().positive().optional(),
  local_guests: z.number().int().min(0).optional(),
  foreigner_guests: z.number().int().min(0).optional(),
  adults: z.number().int().min(0).optional(),
  kids_1_6: z.number().int().min(0).optional(),
  kids_7_12: z.number().int().min(0).optional(),
  duration: z.number().int().min(1).optional(),
  wants_guide: z.boolean().optional(),
  resource_type: z.enum(['kayak', 'water_cycle', 'sup']).optional(),
  booking_date: z.string().datetime().optional(),
  full_name: z.string().min(2).optional(),
  phone_number: z.string().min(1).optional(),
  amount_override: z.number().positive().optional(),
  note: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid booking ID');

  const user = await findActiveUserById(session.user_id);
  if (!user) return errorResponse(403, 'user not found');

  if (session.role === 1 && !user.supplier_id) {
    return errorResponse(403, 'user is not a supplier');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid JSON body');
  }

  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, parsed.error.errors[0]?.message ?? 'validation failed');
  }

  const booking = await Booking.findById(id);
  if (!booking) return errorResponse(404, 'booking not found');

  try {
    const updated = await applyBookingEdit(booking, parsed.data, {
      user_id: user.id,
      role: session.role,
      supplier_id: user.supplier_id?.toString() ?? null,
    });
    return NextResponse.json({ message: 'Booking updated successfully.', booking: updated });
  } catch (err) {
    if (err instanceof BookingEditError) {
      return errorResponse(err.statusCode, err.message);
    }
    throw err;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  if (session.role !== 2) {
    return errorResponse(403, 'Unauthorized');
  }
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid booking ID');

  const booking = await Booking.findById(id);
  if (!booking) return errorResponse(404, 'booking not found');

  let reason: string | undefined;
  try {
    const body = (await request.json()) as { reason?: unknown };
    if (typeof body?.reason === 'string') reason = body.reason;
  } catch {
    // empty body is fine
  }

  try {
    const { wallet_adjustment } = await deleteBookingByAdmin(
      booking,
      { user_id: session.user_id, role: session.role },
      { reason },
    );
    return NextResponse.json({
      message: 'Booking deleted successfully.',
      wallet_adjustment,
    });
  } catch (err) {
    if (err instanceof BookingEditError) {
      return errorResponse(err.statusCode, err.message);
    }
    throw err;
  }
}
