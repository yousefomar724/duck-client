import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { dbConnect } from '../db/connect';
import { Trip } from '../models/trip';
import { Destination } from '../models/destination';
import { toTripResponse, toDestinationResponse } from './trip';
import { resolveLocalized } from '../lib/localize';
import { extractObjectId } from '@/lib/seo/slug';
import { cleanLegacy } from '@/lib/trips/clean-legacy';

/**
 * Server Components must not HTTP-fetch their own /api/v1 routes — these
 * query Mongoose directly and resolve localized fields, mirroring what the
 * API routes do via `toTripResponse`/`toDestinationResponse`.
 *
 * `doc.toJSON()` returns live ObjectId/Date instances. The API routes get
 * away with it because `NextResponse.json` stringifies; an RSC would throw
 * "Only plain objects... can be passed to Client Components" the moment one
 * of these crosses a client boundary, and `'use cache'` has the same
 * requirement. `toPlain()` round-trips through JSON once at this boundary —
 * the resulting ISO date strings are also exactly what `<time dateTime>`,
 * `Offer.validFrom` and `sitemap.lastModified` want.
 */
function toPlain<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface PublicDestination {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  images: string[];
  lat?: number;
  lng?: number;
  activities: string[];
  public_status: 'open' | 'coming-soon';
  operating_hours?: string;
  updated_at?: string;
}

export interface PublicTrip {
  id: string;
  slug: string;
  name: string;
  description: string;
  itinerary: string;
  availability: string;
  cancelation_policy: string;
  meeting_point: string;
  map_url: string;
  faqs: { q: string; a: string }[];
  hide_default_faqs: boolean;
  price: number;
  foreigner_price: number;
  currency: string;
  guide_price: number;
  guide_mandatory: boolean;
  duration: number;
  duration_text?: { ar: string; en: string };
  max_guests: number;
  min_guests: number;
  status: 'active' | 'inactive';
  public_status: 'available' | 'coming-soon';
  refundable: boolean;
  is_tour: boolean;
  from: string;
  to?: string;
  images: string[];
  destinations: PublicDestination[];
  supplier?: { id: string; name: string };
  updated_at?: string;
}


function toPublicDestination(json: Record<string, unknown>): PublicDestination {
  return {
    id: json.id as string,
    slug: json.slug as string,
    name: json.name as string,
    description: json.description as string,
    image: (json.image as string) ?? '',
    images: (json.images as string[]) ?? [],
    lat: json.lat as number | undefined,
    lng: json.lng as number | undefined,
    activities: (json.activities as string[]) ?? [],
    public_status:
      json.public_status === 'coming-soon' ? 'coming-soon' : 'open',
    operating_hours: json.operating_hours as string | undefined,
    updated_at: json.updated_at as string | undefined,
  };
}

function isLocalizedDuration(
  value: unknown,
): value is { ar: string; en: string } {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  return typeof record.ar === "string" || typeof record.en === "string"
}

/**
 * `toTripResponse` only resolves the trip's own localized fields — nested
 * `destinations[]` and `supplier` come from `.populate()` and keep their raw
 * `{en, ar}` shape, so those must be resolved here too before this ever
 * reaches a `t()` call or JSX (an unresolved object there throws/crashes).
 */
function toPublicTrip(json: Record<string, unknown>, locale: string): PublicTrip {
  const destinations = Array.isArray(json.destinations)
    ? (json.destinations as Record<string, unknown>[]).map((d) =>
        toPublicDestination(toDestinationResponse(d, locale)),
      )
    : [];
  const supplier = json.supplier as { id?: string; name?: unknown } | undefined;
  const supplierName = supplier?.name != null ? resolveLocalized(supplier.name, locale) : undefined;

  const faqs = Array.isArray(json.faqs)
    ? (json.faqs as { q?: unknown; a?: unknown }[])
        .map((f) => ({ q: (f.q as string) ?? '', a: (f.a as string) ?? '' }))
        .filter((f) => f.q && f.a)
    : [];

  return {
    id: json.id as string,
    slug: json.slug as string,
    name: json.name as string,
    description: json.description as string,
    itinerary: cleanLegacy((json.itinerary as string) ?? ''),
    availability: cleanLegacy((json.availability as string) ?? ''),
    cancelation_policy: (json.cancelation_policy as string) ?? '',
    meeting_point: (json.meeting_point as string) ?? '',
    map_url: (json.map_url as string) ?? '',
    faqs,
    hide_default_faqs: Boolean(json.hide_default_faqs),
    price: json.price as number,
    foreigner_price: (json.foreigner_price as number) ?? 0,
    currency: (json.currency as string) ?? 'EGP',
    guide_price: (json.guide_price as number) ?? 0,
    guide_mandatory: Boolean(json.guide_mandatory),
    duration: (json.duration as number) ?? 0,
    duration_text: isLocalizedDuration(json.duration_text)
      ? json.duration_text
      : undefined,
    max_guests: json.max_guests as number,
    min_guests: (json.min_guests as number) ?? 1,
    status: (json.status as PublicTrip['status']) ?? 'active',
    public_status: (json.public_status as PublicTrip['public_status']) ?? 'available',
    refundable: Boolean(json.refundable),
    is_tour: Boolean(json.is_tour),
    from: json.from as string,
    to: json.to as string | undefined,
    images: (json.images as string[]) ?? [],
    destinations,
    supplier:
      supplier?.id && supplierName
        ? { id: supplier.id, name: supplierName as string }
        : undefined,
    updated_at: json.updated_at as string | undefined,
  };
}

// Deduplicate page/metadata reads within a request; booking data stays fresh.
export const listPublicTrips = cache(async (locale: string): Promise<PublicTrip[]> => {
  await dbConnect();
  const trips = await Trip.find({ status: { $ne: 'inactive' } })
    .sort({ display_order: 1 })
    .populate('supplier_id')
    .populate('tour_guide_id')
    .populate('destination_ids');

  return trips.map((t) => {
    const plain = toPlain<Record<string, unknown>>(t.toJSON());
    return toPublicTrip(toTripResponse(plain, locale), locale);
  });
});

export const listPublicDestinations = cache(async (
  locale: string,
): Promise<PublicDestination[]> => {
  await dbConnect();
  const destinations = await Destination.find({});

  return destinations.map((d) => {
    const plain = toPlain<Record<string, unknown>>(d.toJSON());
    return toPublicDestination(toDestinationResponse(plain, locale));
  });
});

/**
 * Resolves `/trips/[slug]`. Accepts either a plain name-derived slug or one
 * with a trailing ObjectId (`<anything>-<24-hex>`); callers should redirect
 * to the canonical path when the resolved trip's current slug differs from
 * the one requested (a rename since the URL was last shared/cited).
 */
export const getTripBySlug = cache(async (
  slug: string,
  locale: string,
): Promise<PublicTrip | null> => {
  const id = extractObjectId(slug);
  if (id) {
    await dbConnect();
    const trip = await Trip.findOne({ _id: id, status: { $ne: 'inactive' } })
      .populate('supplier_id')
      .populate('tour_guide_id')
      .populate('destination_ids');
    if (!trip) return null;
    const plain = toPlain<Record<string, unknown>>(trip.toJSON());
    return toPublicTrip(toTripResponse(plain, locale), locale);
  }

  const trips = await listPublicTrips(locale);
  return trips.find((t) => t.slug === slug) ?? null;
});

export const getDestinationBySlug = cache(async (
  slug: string,
  locale: string,
): Promise<PublicDestination | null> => {
  const id = extractObjectId(slug);
  if (id) {
    await dbConnect();
    const destination = await Destination.findById(id);
    if (!destination) return null;
    const plain = toPlain<Record<string, unknown>>(destination.toJSON());
    return toPublicDestination(toDestinationResponse(plain, locale));
  }

  const destinations = await listPublicDestinations(locale);
  return destinations.find((d) => d.slug === slug) ?? null;
});

export interface CatalogueSummary {
  tripCount: number;
  minPrice: number;
  maxPrice: number;
  currency: string;
}

/** English-only summary used by robots-facing surfaces (llms.txt, JSON-LD priceRange) that never see a locale cookie. */
export const getCatalogueSummary = unstable_cache(async (): Promise<CatalogueSummary> => {
  await dbConnect();
  // SEO needs three fields, not every trip's text, images and populated relations.
  const trips = await Trip.find({ status: { $ne: 'inactive' } })
    .select('price foreigner_price currency').lean();
  const prices = trips.flatMap((t) => [t.price, t.foreigner_price || t.price]);
  return {
    tripCount: trips.length,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    currency: trips[0]?.currency ?? 'EGP',
  };
}, ['public-catalogue-summary'], { revalidate: 60 });
