import { Types } from 'mongoose';
import type { BookingDoc, BookingStatus } from '../models/booking';
import { BookingEditError } from './booking-edit';
import { releaseDiscount, undoReleaseDiscount } from './discount';
import { BOOKING_STATUS_TRANSITIONS } from '@/lib/bookings/status';

export interface StatusActor {
  user_id: string;
  role: number;
  supplier_id?: string | null;
}

export async function applyBookingStatus(
  booking: BookingDoc,
  next: BookingStatus,
  actor: StatusActor,
): Promise<BookingDoc> {
  if (actor.role === 1) {
    if (!actor.supplier_id || booking.supplier_id.toString() !== actor.supplier_id) {
      throw new BookingEditError(
        'unauthorized: booking does not belong to your supplier account',
        403,
      );
    }
  } else if (actor.role !== 2) {
    throw new BookingEditError('unauthorized', 403);
  }

  const allowed = BOOKING_STATUS_TRANSITIONS[booking.status] ?? [];
  if (!allowed.includes(next)) {
    throw new BookingEditError(
      `cannot change status from ${booking.status} to ${next}`,
      409,
    );
  }

  const from = booking.status;
  // No transition leads to FAILED today. If one is added, the discount use is
  // given back here — but a paid booking would also need a refund path, or the
  // customer's money stays in the supplier's wallet.
  const release = next === 'FAILED' ? await releaseDiscount(booking, 'failed') : null;
  booking.status = next;
  booking.revisions.push({
    at: new Date(),
    by_user_id: new Types.ObjectId(actor.user_id),
    by_role: actor.role,
    note: `status ${from} → ${next}`,
    amount_before: booking.amount,
    amount_after: booking.amount,
    changes: new Map([['status', { from, to: next }]]),
  });
  try {
    await booking.save();
  } catch (err) {
    if (release) await undoReleaseDiscount(booking, release).catch(() => {});
    throw err;
  }
  return booking;
}
