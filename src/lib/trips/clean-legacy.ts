/**
 * Old `Trip` docs default `availability`/`itinerary` to the literal string
 * `'[]'` (see server/models/trip.ts history) — that string is truthy, so
 * pages that gate on it render a heading followed by the literal text "[]".
 * Scrub it (and other empty-ish placeholders) back to an empty string
 * everywhere it's read, without needing a DB migration.
 */
export function cleanLegacy(value: string): string {
  const trimmed = value.trim();
  return trimmed === '[]' || trimmed === '{}' ? '' : trimmed;
}
