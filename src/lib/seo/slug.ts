/**
 * Slugs are derived, never stored: `kebab(name.en)`, always from the English
 * name (one URL per resource under cookie-based locale — see routing.ts).
 * A trailing 24-hex ObjectId is accepted as a permanent fallback permalink
 * that redirects to the canonical slug if the trip/destination was renamed.
 */

const OBJECT_ID_RE = /[0-9a-f]{24}$/i

// Combining diacritical marks (U+0300-U+036F), stripped after NFKD
// normalization so accented Latin characters degrade to plain ASCII.
const COMBINING_DIACRITICS_RE = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g')

export function kebab(value: string): string {
  return value
    .normalize("NFKD")
    .replace(COMBINING_DIACRITICS_RE, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function tripSlug(trip: { id: string; name: string }): string {
  const base = kebab(trip.name)
  return base ? base : `trip-${trip.id}`
}

export function destinationSlug(destination: {
  id: string
  name: string
}): string {
  const base = kebab(destination.name)
  return base ? base : `destination-${destination.id}`
}

/** Extracts a trailing 24-hex ObjectId from a slug, if present. */
export function extractObjectId(slug: string): string | null {
  const match = slug.match(OBJECT_ID_RE)
  return match ? match[0] : null
}

export function canonicalTripPath(trip: { id: string; name: string }): string {
  return `/trips/${tripSlug(trip)}`
}

export function canonicalDestinationPath(destination: {
  id: string
  name: string
}): string {
  return `/destinations/${destinationSlug(destination)}`
}
