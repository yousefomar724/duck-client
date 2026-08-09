import { randomUUID } from 'crypto';
import { Trip } from '../models/trip';
import type { BookingDoc } from '../models/booking';
import { isValidResourceType } from './resource-type';
import { checkAvailability } from './availability';
import { minimumDeposit } from '@/lib/booking/pricing';

export interface CreateBookingInput {
  trip_id: string;
  full_name: string;
  phone_number: string;
  booking_date: string;
  resource_type?: string;
  quantity?: number;
  local_guests?: number;
  foreigner_guests?: number;
  duration?: number;
  wants_guide?: boolean;
  played_before?: boolean | null;
  hear_about_us?: string;
  referral_text?: string;
  /** Amount the customer chose to send now (deposit or full); clamped server-side. */
  declared_amount?: number;
}

export interface BuiltBooking {
  order_ref: string;
  user_id: string | null;
  trip_id: string;
  supplier_id: string;
  amount: number;
  currency: string;
  full_name: string;
  phone_number: string;
  status: 'PENDING';
  payment_method: 'MANUAL';
  booking_date: Date;
  quantity: number;
  local_guests: number;
  foreigner_guests: number;
  resource_type: string;
  wants_guide: boolean;
  played_before?: boolean | null;
  hear_about_us: string;
  referral_text: string;
  declared_amount: number;
  amount_paid: number;
  duration: number;
  pricing_snapshot: { price: number; foreigner_price: number; guide_price: number };
  pricing_locked: boolean;
  refund_owed: number;
}

export interface ComputeBookingAmountInput {
  is_tour: boolean;
  price: number;
  foreigner_price: number;
  guide_price: number;
  guide_mandatory: boolean;
}

export interface ComputeBookingAmountResult {
  amount: number;
  quantity: number;
  localGuests: number;
  foreignerGuests: number;
}

/**
 * Pure pricing arithmetic extracted from buildBooking for unit testing.
 */
export function computeBookingAmount(
  trip: ComputeBookingAmountInput,
  req: Pick<CreateBookingInput, 'quantity' | 'local_guests' | 'foreigner_guests' | 'duration' | 'wants_guide'>,
): ComputeBookingAmountResult {
  let quantity = req.quantity && req.quantity > 0 ? req.quantity : 1;
  const localGuests = req.local_guests ?? 0;
  const foreignerGuests = req.foreigner_guests ?? 0;
  const guests = localGuests + foreignerGuests;
  const duration = req.duration ?? 0;

  let amount: number;
  if (localGuests === 0 && foreignerGuests === 0) {
    amount = trip.is_tour ? trip.price * guests * duration : trip.price * quantity;
  } else {
    let totalLocal = trip.price * localGuests;
    let totalForeigner = trip.foreigner_price * foreignerGuests;
    if (trip.is_tour) {
      totalLocal *= duration;
      totalForeigner *= duration;
    } else {
      quantity = localGuests + foreignerGuests;
    }
    amount = totalLocal + totalForeigner;
  }

  if (req.wants_guide || trip.guide_mandatory) {
    amount += trip.guide_price;
  }

  return { amount, quantity, localGuests, foreignerGuests };
}

/**
 * Reproduces the Go `buildBooking` pricing engine exactly:
 * 1. guests = local + foreigner; reject if it exceeds trip.max_guests
 * 2. no per-type guest split -> price * guests * duration (tour) or price * quantity
 * 3. per-type split -> local*price + foreigner*foreigner_price (each *duration if tour);
 *    non-tour trips recompute quantity as local+foreigner
 * 4. += guide_price when wants_guide or guide_mandatory
 */
export async function buildBooking(
  userId: string | null,
  req: CreateBookingInput,
): Promise<BuiltBooking> {
  const trip = await Trip.findById(req.trip_id);
  if (!trip) throw new Error('trip not found');

  let quantity = req.quantity && req.quantity > 0 ? req.quantity : 1;
  const localGuests = req.local_guests ?? 0;
  const foreignerGuests = req.foreigner_guests ?? 0;
  const guests = localGuests + foreignerGuests;

  if (req.resource_type && !isValidResourceType(req.resource_type)) {
    throw new Error(
      `invalid resource type: ${req.resource_type}. Allowed types: kayak, water_cycle, sup`,
    );
  }

  if (guests > trip.max_guests) {
    throw new Error(`guests exceed maximum allowed: ${trip.max_guests}`);
  }

  if (req.resource_type) {
    await checkAvailability(
      trip.supplier_id.toString(),
      req.resource_type,
      new Date(req.booking_date),
      quantity,
    );
  }

  const { amount, quantity: computedQuantity, localGuests: computedLocal, foreignerGuests: computedForeigner } = computeBookingAmount(
    {
      is_tour: trip.is_tour,
      price: trip.price,
      foreigner_price: trip.foreigner_price,
      guide_price: trip.guide_price,
      guide_mandatory: trip.guide_mandatory,
    },
    req,
  );
  quantity = computedQuantity;

  const duration = trip.is_tour ? (req.duration ?? 1) : 0;

  // The client-side `min` attribute on the deposit input is not a security
  // boundary — clamp here to [minimumDeposit(amount), amount]. Anything
  // outside that range (including omitted/zero) is treated as full payment.
  const minDeposit = minimumDeposit(amount);
  const declaredAmount =
    req.declared_amount && req.declared_amount >= minDeposit && req.declared_amount <= amount
      ? req.declared_amount
      : amount;

  return {
    order_ref: randomUUID(),
    user_id: userId,
    trip_id: req.trip_id,
    supplier_id: trip.supplier_id.toString(),
    amount,
    currency: trip.currency,
    full_name: req.full_name,
    phone_number: req.phone_number,
    status: 'PENDING',
    payment_method: 'MANUAL',
    booking_date: new Date(req.booking_date),
    quantity,
    local_guests: computedLocal,
    foreigner_guests: computedForeigner,
    resource_type: req.resource_type ?? '',
    wants_guide: req.wants_guide ?? false,
    played_before: req.played_before ?? null,
    hear_about_us: req.hear_about_us ?? '',
    referral_text: req.referral_text ?? '',
    declared_amount: declaredAmount,
    amount_paid: 0,
    duration,
    pricing_snapshot: {
      price: trip.price,
      foreigner_price: trip.foreigner_price,
      guide_price: trip.guide_price,
    },
    pricing_locked: false,
    refund_owed: 0,
  };
}

function extractTripDestinations(
  populatedTrip: {
    destinations?: { name?: { ar?: string; en?: string } }[];
    destination_ids?: unknown;
    toJSON?: () => Record<string, unknown>;
  } | null,
): { name?: { ar?: string; en?: string } }[] {
  if (!populatedTrip) return [];

  if (typeof populatedTrip.toJSON === 'function') {
    const json = populatedTrip.toJSON();
    if (Array.isArray(json.destinations)) {
      return json.destinations as { name?: { ar?: string; en?: string } }[];
    }
  }

  if (Array.isArray(populatedTrip.destinations)) {
    return populatedTrip.destinations;
  }

  const ids = populatedTrip.destination_ids;
  if (Array.isArray(ids) && ids.length > 0 && typeof ids[0] === 'object' && ids[0] !== null) {
    return ids as { name?: { ar?: string; en?: string } }[];
  }

  return [];
}

/**
 * Builds the data shape `formatBookingEmailBody` (mail.ts) expects from a
 * booking populated with `trip.destinations` and `user`.
 */
export function toBookingEmailData(booking: BookingDoc) {
  const populatedTrip = booking.trip_id as unknown as {
    name?: { ar?: string; en?: string };
    is_tour?: boolean;
    destinations?: { name?: { ar?: string; en?: string } }[];
    destination_ids?: unknown;
    toJSON?: () => Record<string, unknown>;
  } | null;
  const populatedUser = booking.user_id as unknown as { email?: string } | null;

  const destinationNames = extractTripDestinations(populatedTrip)
    .map((d) => localizedAr(d.name))
    .filter(Boolean);

  return {
    id: booking.id,
    full_name: booking.full_name,
    phone_number: booking.phone_number,
    booking_date: booking.booking_date,
    updated_at: (booking as unknown as { updated_at: Date }).updated_at,
    quantity: booking.quantity,
    wants_guide: booking.wants_guide,
    played_before: booking.played_before,
    hear_about_us: booking.hear_about_us,
    amount: booking.amount,
    currency: booking.currency,
    declared_amount: booking.declared_amount,
    status: booking.status,
    user_email: populatedUser?.email,
    destination_names: destinationNames,
    trip_name_en: populatedTrip?.name?.en?.trim() ?? '',
    trip_name_ar: localizedAr(populatedTrip?.name ?? null),
    is_tour: populatedTrip?.is_tour ?? false,
  };
}

function localizedAr(value?: { ar?: string; en?: string } | null): string {
  if (!value) return '';
  const ar = value.ar?.trim();
  const en = value.en?.trim();
  return ar || en || '';
}
