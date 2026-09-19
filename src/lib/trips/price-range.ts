/**
 * "From" prices for a set of trips, split by the two tiers the business
 * actually charges (Egyptian residents vs. foreign visitors).
 *
 * Each tier is minimised independently: a destination whose cheapest local
 * trip is not its cheapest foreigner trip still advertises a truthful
 * "from" price on both lines.
 */
export interface TripPriceRange {
  /** Lowest Egyptian-resident price across the trips. */
  localFrom: number
  /** Lowest foreigner price, or `null` when no trip has a second tier. */
  foreignerFrom: number | null
  currency: string
}

type PricedTrip = {
  price: number
  foreigner_price?: number | null
  currency?: string
}

export function tripPriceRange(trips: PricedTrip[]): TripPriceRange | null {
  const priced = trips.filter((trip) => trip.price > 0)
  if (!priced.length) return null

  const foreignerPrices = priced
    .map((trip) => trip.foreigner_price ?? 0)
    .filter((price) => price > 0)

  return {
    localFrom: Math.min(...priced.map((trip) => trip.price)),
    foreignerFrom: foreignerPrices.length ? Math.min(...foreignerPrices) : null,
    currency: priced[0].currency || "EGP",
  }
}
