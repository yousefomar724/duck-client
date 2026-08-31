import { resolveLocalized } from '../lib/localize';
import { Trip, type TripDoc, type TripFaq } from '../models/trip';
import type { LocalizedText } from '../models/supplier';
import { parseDurationHoursFromLocalized } from '@/lib/trips/duration';

export interface CreateTripBody {
  supplier_id?: string;
  is_tour?: boolean;
  price: number;
  foreigner_price?: number;
  guide_mandatory?: boolean;
  guide_price?: number;
  display_order?: number;
  currency?: string;
  destination?: boolean;
  location?: boolean;
  from: string;
  to?: string | null;
  duration?: number;
  activity_minutes?: number;
  duration_text?: LocalizedText;
  itinerary?: LocalizedText;
  name: LocalizedText;
  description: LocalizedText;
  availability?: LocalizedText;
  max_guests: number;
  images?: unknown;
  cancelation_policy?: LocalizedText;
  meeting_point?: LocalizedText;
  map_url?: string;
  faqs?: TripFaq[];
  hide_default_faqs?: boolean;
  refundable?: boolean;
  tour_guide_id?: string | null;
  destination_ids?: string[];
}

/** Mirrors Go's `TripService.CreateTrip` field defaults. */
export async function createTripFromRequest(supplierId: string, body: CreateTripBody): Promise<TripDoc> {
  let duration = body.duration ?? 0;
  if (!body.is_tour && body.duration_text) {
    duration = parseDurationHoursFromLocalized(body.duration_text) ?? 1;
  } else if (duration === 0 && !body.is_tour) {
    duration = 1;
  }

  const from = new Date(body.from);
  if (isNaN(from.getTime())) {
    throw new Error('تاريخ البدء غير صحيح');
  }

  let to = body.to ? new Date(body.to) : null;
  if (!to || isNaN(to.getTime())) {
    to = new Date(from);
    to.setDate(to.getDate() + duration);
  }

  const availability = body.availability ?? { en: '', ar: '' };

  const trip = await Trip.create({
    supplier_id: supplierId,
    is_tour: body.is_tour ?? false,
    price: body.price,
    foreigner_price: body.foreigner_price ?? 0,
    guide_mandatory: body.guide_mandatory ?? false,
    guide_price: body.guide_price ?? 0,
    display_order: body.display_order ?? 0,
    currency: body.currency || 'EGP',
    destination: body.destination ?? false,
    location: body.location ?? false,
    from,
    to,
    duration,
    activity_minutes: body.activity_minutes ?? (!body.is_tour && duration > 0 ? duration * 60 : null),
    duration_text: body.is_tour ? { en: '', ar: '' } : (body.duration_text ?? { en: '', ar: '' }),
    max_guests: body.max_guests,
    refundable: body.refundable ?? false,
    tour_guide_id: body.tour_guide_id || null,
    name: body.name,
    description: body.description,
    itinerary: body.itinerary ?? { en: '', ar: '' },
    availability,
    cancelation_policy: body.cancelation_policy ?? { en: '', ar: '' },
    meeting_point: body.meeting_point ?? { en: '', ar: '' },
    map_url: body.map_url ?? '',
    faqs: body.faqs ?? [],
    hide_default_faqs: body.hide_default_faqs ?? false,
    images: normalizeImageUrls(body.images),
    destination_ids: body.destination_ids ?? [],
  });

  return trip;
}

/** Mirrors Go's `TripService.UpdateTrip`: only overwrite fields present/truthy in the request. */
export function applyTripUpdate(trip: TripDoc, body: Partial<CreateTripBody>): void {
  const isTour = body.is_tour ?? trip.is_tour;
  let duration = body.duration ?? 0;
  if (!isTour && body.duration_text) {
    duration = parseDurationHoursFromLocalized(body.duration_text) ?? 1;
  }

  trip.is_tour = body.is_tour ?? false;

  if (body.price) trip.price = body.price;
  if (body.foreigner_price) trip.foreigner_price = body.foreigner_price;
  trip.guide_mandatory = body.guide_mandatory ?? false;
  if (body.guide_price) trip.guide_price = body.guide_price;
  if (body.display_order) trip.display_order = body.display_order;
  if (body.currency) trip.currency = body.currency;
  if (body.destination !== undefined) trip.destination = body.destination;
  if (body.location !== undefined) trip.location = body.location;

  if (body.from) trip.from = new Date(body.from);
  if (body.to) trip.to = new Date(body.to);
  if (!body.to) {
    const from = body.from ? new Date(body.from) : trip.from;
    const to = new Date(from);
    to.setDate(to.getDate() + (duration || trip.duration));
    trip.to = to;
  }
  if (duration) trip.duration = duration;
  if (body.activity_minutes !== undefined) trip.activity_minutes = body.activity_minutes;
  // Assigned whenever present so an empty pair can clear stale free text —
  // `if (body.duration_text)` would keep a trip's old duration after it is
  // switched to a tour, and the display sites prefer the text over the number.
  if (isTour) {
    trip.duration_text = { en: '', ar: '' };
  } else if (body.duration_text !== undefined) {
    trip.duration_text = body.duration_text;
  }
  if (body.max_guests) trip.max_guests = body.max_guests;
  if (body.refundable) trip.refundable = body.refundable;
  // `if (body.tour_guide_id)` treated an explicit null as "no change", making
  // it impossible to remove a guide once one had been assigned.
  if (body.tour_guide_id !== undefined) {
    trip.tour_guide_id = (body.tour_guide_id || null) as unknown as TripDoc['tour_guide_id'];
  }

  if (body.name) trip.name = body.name;
  if (body.description) trip.description = body.description;
  if (body.itinerary) trip.itinerary = body.itinerary;
  if (body.images !== undefined) trip.images = normalizeImageUrls(body.images);
  if (body.cancelation_policy) trip.cancelation_policy = body.cancelation_policy;
  if (body.availability) trip.availability = body.availability;
  if (body.meeting_point) trip.meeting_point = body.meeting_point;
  if (body.map_url !== undefined) trip.map_url = body.map_url;
  if (body.faqs !== undefined) trip.faqs = body.faqs as unknown as TripDoc['faqs'];
  if (body.hide_default_faqs !== undefined) trip.hide_default_faqs = body.hide_default_faqs;
  if (body.destination_ids && body.destination_ids.length > 0) {
    trip.destination_ids = body.destination_ids as unknown as TripDoc['destination_ids'];
  }
}

/** Accepts the Go `ImageURLs` shapes: a plain array, or a legacy `{img1: "...", img2: "..."}` object. */
export function normalizeImageUrls(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string' && v !== '');
  if (typeof raw === 'object') {
    return Object.values(raw as Record<string, unknown>).filter(
      (v): v is string => typeof v === 'string' && v !== '',
    );
  }
  return [];
}


/**
 * Mirrors Go's `Trip.ToResponse(lang)`. Takes the already-serialized trip
 * JSON (post toJSON transform, with supplier/tour_guide/destinations already
 * populated) and resolves the bilingual fields. `images` is always an array
 * (never a `{en,ar}` map) so it passes through unresolved, matching the Go
 * behavior where the map-unmarshal attempt silently fails and the raw array
 * is returned unchanged.
 */
export function toTripResponse(trip: Record<string, unknown>, lang: string): Record<string, unknown> {
  const faqs = Array.isArray(trip.faqs)
    ? (trip.faqs as Record<string, unknown>[]).map((f) => ({
        q: resolveLocalized(f.q, lang),
        a: resolveLocalized(f.a, lang),
      }))
    : [];

  return {
    ...trip,
    itinerary: resolveLocalized(trip.itinerary, lang),
    name: resolveLocalized(trip.name, lang),
    description: resolveLocalized(trip.description, lang),
    availability: resolveLocalized(trip.availability, lang),
    cancelation_policy: resolveLocalized(trip.cancelation_policy, lang),
    meeting_point: resolveLocalized(trip.meeting_point, lang),
    faqs,
  };
}

export function toDestinationResponse(
  destination: Record<string, unknown>,
  lang: string,
): Record<string, unknown> {
  return {
    ...destination,
    name: resolveLocalized(destination.name, lang),
    description: resolveLocalized(destination.description, lang),
  };
}
