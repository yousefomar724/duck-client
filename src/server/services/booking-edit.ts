import { Types } from 'mongoose';
import type { BookingDoc } from '../models/booking';
import { Trip } from '../models/trip';
import { computeBookingAmount } from './booking';
import { checkAvailability, NoAvailabilityError } from './availability';
import { isValidResourceType } from './resource-type';
import { DeletedBooking } from '../models/deleted-booking';
import { creditWalletBySupplierId } from './wallet';
import { resolveGuestBreakdown } from '@/lib/bookings/guests';
import {
  BOOKING_MAX_MINUTES,
  BOOKING_MIN_MINUTES,
} from '@/lib/booking/schedule';

export interface BookingEditPatch {
  quantity?: number;
  local_guests?: number;
  foreigner_guests?: number;
  adults?: number;
  kids_1_6?: number;
  kids_7_12?: number;
  duration?: number;
  wants_guide?: boolean;
  resource_type?: string;
  booking_date?: string;
  full_name?: string;
  phone_number?: string;
  /** Admin-only: bypass snapshot repricing */
  amount_override?: number;
  note?: string;
}

export interface BookingEditActor {
  user_id: string;
  role: number;
  supplier_id?: string | null;
}

export class BookingEditError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

const EDITABLE_STATUSES = ['PENDING', 'CONFIRMED'] as const;

function isBookingTimeValid(date: Date): boolean {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= BOOKING_MIN_MINUTES && minutes <= BOOKING_MAX_MINUTES;
}

function snapshotFromBooking(booking: BookingDoc) {
  const snap = booking.pricing_snapshot;
  if (snap && (snap.price > 0 || snap.foreigner_price > 0 || snap.guide_price > 0)) {
    return snap;
  }
  return { price: 0, foreigner_price: 0, guide_price: 0 };
}

function buildChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Map<string, { from: unknown; to: unknown }> {
  const changes = new Map<string, { from: unknown; to: unknown }>();
  for (const key of Object.keys(after)) {
    const fromVal = before[key];
    const toVal = after[key];
    if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
      changes.set(key, { from: fromVal, to: toVal });
    }
  }
  return changes;
}

/**
 * Applies a priced revision to a booking, settling wallet/ledger deltas.
 * Wallet is updated before save; a compensating reverse credit runs on save failure.
 */
export async function applyBookingEdit(
  booking: BookingDoc,
  patch: BookingEditPatch,
  actor: BookingEditActor,
): Promise<BookingDoc> {
  if (!EDITABLE_STATUSES.includes(booking.status as (typeof EDITABLE_STATUSES)[number])) {
    throw new BookingEditError(`cannot edit booking with status: ${booking.status}`);
  }

  if (actor.role === 1) {
    if (!actor.supplier_id || booking.supplier_id.toString() !== actor.supplier_id) {
      throw new BookingEditError('unauthorized: booking does not belong to your supplier account', 403);
    }
    if (patch.amount_override != null) {
      throw new BookingEditError('suppliers cannot override booking amount', 403);
    }
  } else if (actor.role !== 2) {
    throw new BookingEditError('unauthorized', 403);
  }

  const trip = await Trip.findById(booking.trip_id);
  if (!trip) throw new BookingEditError('trip not found', 404);

  const before = {
    quantity: booking.quantity,
    local_guests: booking.local_guests,
    foreigner_guests: booking.foreigner_guests,
    adults: booking.adults ?? 0,
    kids_1_6: booking.kids_1_6 ?? 0,
    kids_7_12: booking.kids_7_12 ?? 0,
    duration: booking.duration,
    wants_guide: booking.wants_guide,
    resource_type: booking.resource_type,
    booking_date: booking.booking_date.toISOString(),
    full_name: booking.full_name,
    phone_number: booking.phone_number,
    amount: booking.amount,
  };

  const nextQuantity = patch.quantity ?? booking.quantity;
  const nextLocalGuests = patch.local_guests ?? booking.local_guests;
  const nextForeignerGuests = patch.foreigner_guests ?? booking.foreigner_guests;
  const nextDuration = patch.duration ?? booking.duration;
  const nextWantsGuide = patch.wants_guide ?? booking.wants_guide;
  const nextResourceType = patch.resource_type ?? booking.resource_type ?? '';
  const nextBookingDate = patch.booking_date
    ? new Date(patch.booking_date)
    : booking.booking_date;
  const nextFullName = patch.full_name?.trim() ?? booking.full_name;
  const nextPhone = patch.phone_number?.trim() ?? booking.phone_number;

  if (nextResourceType && !isValidResourceType(nextResourceType)) {
    throw new BookingEditError(
      `invalid resource type: ${nextResourceType}. Allowed types: kayak, water_cycle, sup`,
    );
  }

  const guests = nextLocalGuests + nextForeignerGuests;
  if (guests > trip.max_guests) {
    throw new BookingEditError(`guests exceed maximum allowed: ${trip.max_guests}`);
  }

  let guestBreakdown: { adults: number; kids_1_6: number; kids_7_12: number };
  try {
    guestBreakdown =
      guests > 0
        ? resolveGuestBreakdown({
            guests,
            adults: patch.adults,
            kids_1_6: patch.kids_1_6 ?? booking.kids_1_6 ?? 0,
            kids_7_12: patch.kids_7_12 ?? booking.kids_7_12 ?? 0,
          })
        : {
            adults: patch.adults ?? booking.adults ?? nextQuantity,
            kids_1_6: 0,
            kids_7_12: 0,
          };
  } catch (err) {
    throw new BookingEditError(
      err instanceof Error ? err.message : 'guest breakdown mismatch',
    );
  }

  if (nextBookingDate.getTime() < Date.now() - 60_000) {
    throw new BookingEditError('booking date must be in the future');
  }

  if (!isBookingTimeValid(nextBookingDate)) {
    throw new BookingEditError('booking time must be between 06:00 and 18:30');
  }

  const capacityChanged =
    nextQuantity !== booking.quantity ||
    nextResourceType !== (booking.resource_type ?? '') ||
    nextBookingDate.toDateString() !== booking.booking_date.toDateString();

  if (nextResourceType && capacityChanged) {
    try {
      await checkAvailability(
        booking.supplier_id.toString(),
        nextResourceType,
        nextBookingDate,
        nextQuantity,
        booking.id,
      );
    } catch (err) {
      if (err instanceof NoAvailabilityError) {
        throw new BookingEditError(err.message, 409);
      }
      throw err;
    }
  }

  let newAmount: number;
  let computedQuantity = nextQuantity;

  if (patch.amount_override != null && actor.role === 2) {
    if (patch.amount_override <= 0) {
      throw new BookingEditError('amount_override must be positive');
    }
    newAmount = patch.amount_override;
  } else if (booking.pricing_locked) {
    newAmount = booking.amount;
  } else {
    const snapshot = snapshotFromBooking(booking);
    const pricingInput = {
      is_tour: trip.is_tour,
      price: snapshot.price,
      foreigner_price: snapshot.foreigner_price,
      guide_price: snapshot.guide_price,
      guide_mandatory: trip.guide_mandatory,
    };

    const durationForPricing = trip.is_tour ? nextDuration : 0;
    const result = computeBookingAmount(pricingInput, {
      quantity: nextQuantity,
      local_guests: nextLocalGuests,
      foreigner_guests: nextForeignerGuests,
      duration: durationForPricing,
      wants_guide: nextWantsGuide,
    });
    newAmount = result.amount;
    computedQuantity = result.quantity;
  }

  const amountBefore = booking.amount;
  const amountPaid = booking.amount_paid ?? 0;
  let walletDelta = 0;

  if (newAmount < amountPaid) {
    const owed = amountPaid - newAmount;
    walletDelta = -owed;
    booking.refund_owed = (booking.refund_owed ?? 0) + owed;
    booking.payment_entries.push({
      amount: -owed,
      recorded_at: new Date(),
      note: patch.note ? `edit refund owed: ${patch.note}` : 'edit refund owed',
    });
  } else {
    booking.refund_owed = 0;
  }

  if (walletDelta !== 0) {
    await creditWalletBySupplierId(booking.supplier_id.toString(), walletDelta, {
      allowNegative: true,
    });
  }

  booking.quantity = computedQuantity;
  booking.local_guests = nextLocalGuests;
  booking.foreigner_guests = nextForeignerGuests;
  booking.adults = guestBreakdown.adults;
  booking.kids_1_6 = guestBreakdown.kids_1_6;
  booking.kids_7_12 = guestBreakdown.kids_7_12;
  booking.duration = trip.is_tour ? nextDuration : 0;
  booking.wants_guide = nextWantsGuide;
  booking.resource_type = nextResourceType;
  booking.booking_date = nextBookingDate;
  booking.full_name = nextFullName;
  booking.phone_number = nextPhone;
  booking.amount = newAmount;

  if (booking.declared_amount > newAmount) {
    booking.declared_amount = newAmount;
  }

  const after = {
    quantity: booking.quantity,
    local_guests: booking.local_guests,
    foreigner_guests: booking.foreigner_guests,
    adults: booking.adults,
    kids_1_6: booking.kids_1_6,
    kids_7_12: booking.kids_7_12,
    duration: booking.duration,
    wants_guide: booking.wants_guide,
    resource_type: booking.resource_type,
    booking_date: booking.booking_date.toISOString(),
    full_name: booking.full_name,
    phone_number: booking.phone_number,
    amount: booking.amount,
  };

  const changes = buildChanges(before, after);
  if (changes.size > 0) {
    booking.revisions.push({
      at: new Date(),
      by_user_id: new Types.ObjectId(actor.user_id),
      by_role: actor.role,
      note: patch.note ?? '',
      amount_before: amountBefore,
      amount_after: newAmount,
      changes,
    });
  }

  try {
    await booking.save();
  } catch (err) {
    if (walletDelta !== 0) {
      await creditWalletBySupplierId(booking.supplier_id.toString(), -walletDelta, {
        allowNegative: true,
      }).catch(() => {});
    }
    throw err;
  }

  return booking;
}

export async function markRefundSent(
  booking: BookingDoc,
  actor: BookingEditActor,
  note?: string,
): Promise<BookingDoc> {
  if (actor.role === 1) {
    if (!actor.supplier_id || booking.supplier_id.toString() !== actor.supplier_id) {
      throw new BookingEditError('unauthorized: booking does not belong to your supplier account', 403);
    }
  } else if (actor.role !== 2) {
    throw new BookingEditError('unauthorized', 403);
  }

  if (!booking.refund_owed || booking.refund_owed <= 0) {
    throw new BookingEditError('no refund is owed on this booking');
  }

  const cleared = booking.refund_owed;
  booking.refund_owed = 0;
  booking.payment_entries.push({
    amount: 0,
    recorded_at: new Date(),
    note: note ? `refund sent to customer: ${note}` : `refund sent to customer (${cleared})`,
  });
  await booking.save();
  return booking;
}

export async function cancelBookingByStaff(
  booking: BookingDoc,
  actor: BookingEditActor,
  reason?: string,
): Promise<BookingDoc> {
  if (!EDITABLE_STATUSES.includes(booking.status as (typeof EDITABLE_STATUSES)[number])) {
    throw new BookingEditError(`cannot cancel booking with status: ${booking.status}`);
  }

  if (actor.role === 1) {
    if (!actor.supplier_id || booking.supplier_id.toString() !== actor.supplier_id) {
      throw new BookingEditError('unauthorized: booking does not belong to your supplier account', 403);
    }
  } else if (actor.role !== 2) {
    throw new BookingEditError('unauthorized', 403);
  }

  const amountPaid = booking.amount_paid ?? 0;
  booking.status = amountPaid > 0 ? 'REFUND_PENDING' : 'CANCELLED';
  booking.cancelled_at = new Date();
  booking.cancelled_by = new Types.ObjectId(actor.user_id);
  booking.cancel_reason = reason?.trim() ?? '';
  await booking.save();
  return booking;
}

/** Kept for tests / emergencies. The UI never sends `mode: 'soft'`. */
export async function softDeleteBooking(booking: BookingDoc): Promise<void> {
  booking.deletedAt = new Date();
  await booking.save();
}

export async function deleteBookingByAdmin(
  booking: BookingDoc,
  actor: BookingEditActor,
  options?: { reason?: string; mode?: 'hard' | 'soft' },
): Promise<{ wallet_adjustment: number }> {
  if (actor.role !== 2) {
    throw new BookingEditError('unauthorized', 403);
  }

  if (options?.mode === 'soft') {
    await softDeleteBooking(booking);
    return { wallet_adjustment: 0 };
  }

  const walletExposure =
    booking.status === 'REFUNDED' ? 0 : (booking.amount_paid ?? 0);
  const supplierId = booking.supplier_id.toString();

  if (walletExposure !== 0) {
    await creditWalletBySupplierId(supplierId, -walletExposure, {
      allowNegative: true,
    });
  }

  try {
    await DeletedBooking.create({
      original_id: booking._id,
      snapshot: booking.toObject(),
      deleted_at: new Date(),
      deleted_by: new Types.ObjectId(actor.user_id),
      deleted_by_role: actor.role,
      reason: options?.reason?.trim() ?? '',
      wallet_adjustment: -walletExposure,
    });
    await booking.deleteOne();
  } catch (err) {
    if (walletExposure !== 0) {
      await creditWalletBySupplierId(supplierId, walletExposure, {
        allowNegative: true,
      }).catch(() => {});
    }
    throw err;
  }

  return { wallet_adjustment: -walletExposure };
}
