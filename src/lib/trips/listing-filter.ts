/**
 * Filters for the public `/trips` listing. Kept framework-free so the page,
 * the footer links and tests all build/parse the same URLs.
 *
 *   /trips?type=tour         → tours only
 *   /trips?type=trip         → trips only
 *   /trips?activity=kayak    → anything offering kayaking
 */

/** Same ids as `DestinationActivity` so a destination's activities can stand in for a trip's. */
export const TRIP_ACTIVITIES = ["kayak", "sup", "waterbike"] as const
export type TripActivity = (typeof TRIP_ACTIVITIES)[number]

export const TRIP_KINDS = ["tour", "trip"] as const
export type TripKind = (typeof TRIP_KINDS)[number]

export interface TripListingFilter {
  type?: TripKind
  activity?: TripActivity
}

export function isTripActivity(value: unknown): value is TripActivity {
  return (TRIP_ACTIVITIES as readonly unknown[]).includes(value)
}

type SearchParamValue = string | string[] | undefined

function first(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/** Unknown values are dropped, so a mistyped link shows everything rather than nothing. */
export function parseTripListingFilter(
  params: Record<string, SearchParamValue>,
): TripListingFilter {
  const type = first(params.type)
  const activity = first(params.activity)
  return {
    type: (TRIP_KINDS as readonly string[]).includes(type ?? "")
      ? (type as TripKind)
      : undefined,
    activity: isTripActivity(activity) ? activity : undefined,
  }
}

export function tripListingHref(filter: TripListingFilter = {}): string {
  const search = new URLSearchParams()
  if (filter.type) search.set("type", filter.type)
  if (filter.activity) search.set("activity", filter.activity)
  const qs = search.toString()
  return qs ? `/trips?${qs}` : "/trips"
}

interface FilterableTrip {
  is_tour?: boolean
  activities?: readonly string[]
  destinations?: readonly { activities?: readonly string[] }[]
}

/**
 * The trip's own activities when an admin has set them; otherwise whatever
 * its destinations offer, so trips created before the field existed still
 * show up under the right filter.
 */
export function resolveTripActivities(trip: FilterableTrip): TripActivity[] {
  const own = (trip.activities ?? []).filter(isTripActivity)
  if (own.length > 0) return [...new Set(own)]
  const fromDestinations = (trip.destinations ?? []).flatMap(
    (d) => d.activities ?? [],
  )
  return TRIP_ACTIVITIES.filter((a) => fromDestinations.includes(a))
}

export function matchesTripListingFilter(
  trip: FilterableTrip,
  filter: TripListingFilter,
): boolean {
  if (filter.type === "tour" && !trip.is_tour) return false
  if (filter.type === "trip" && trip.is_tour) return false
  if (filter.activity && !resolveTripActivities(trip).includes(filter.activity)) {
    return false
  }
  return true
}
