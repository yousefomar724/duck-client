import { SITE_CONTACT, SITE_NAME, SITE_URL } from "@/lib/site"
import { canonicalDestinationPath, canonicalTripPath } from "@/lib/seo/slug"
import {
  listPublicDestinations,
  listPublicTrips,
} from "@/server/services/public-content"
import { formatCurrency } from "@/lib/constants"

/**
 * Community convention, not a standard — no major crawler is documented to
 * fetch either file. Cheap insurance; the server-rendered HTML and JSON-LD
 * on the trip/destination pages are what actually earn citations.
 */
export async function buildLlmsTxt(): Promise<string> {
  const [trips, destinations] = await Promise.all([
    listPublicTrips("en"),
    listPublicDestinations("en"),
  ])

  const lines: string[] = []
  lines.push(`# ${SITE_NAME}`)
  lines.push("")
  lines.push(
    "> Kayaking, stand-up paddleboarding and water-bike trips on the Nile around " +
      "Elephantine Island in Aswan, Egypt. One location, booked online or by WhatsApp.",
  )
  lines.push("")

  lines.push("## Key facts")
  lines.push(
    `- Location: ${SITE_CONTACT.street}, ${SITE_CONTACT.city}, ${SITE_CONTACT.country}`,
  )
  lines.push("- Hours: daily, sunrise to sunset, by advance booking")
  lines.push("- Prices in EGP, two tiers: Egyptian residents and foreign visitors")
  lines.push("- Payment: InstaPay or cash. No card gateway.")
  lines.push(`- Contact: ${SITE_CONTACT.phone} · ${SITE_CONTACT.email}`)
  lines.push("- Languages: Arabic, English")
  lines.push("")

  lines.push("## Trips")
  for (const trip of trips) {
    const priceLine = trip.foreigner_price
      ? `${formatCurrency(trip.price, trip.currency, "en")} (Egyptian residents) / ${formatCurrency(trip.foreigner_price, trip.currency, "en")} (foreign visitors)`
      : formatCurrency(trip.price, trip.currency, "en")
    lines.push(
      `- [${trip.name}](${SITE_URL}${canonicalTripPath(trip)}): ` +
        `${trip.duration || 1} hour(s), up to ${trip.max_guests} guests. ${priceLine}. ` +
        `Book: ${SITE_URL}/book?trip=${trip.id}`,
    )
  }
  lines.push("")

  lines.push("## Where you meet us")
  for (const destination of destinations) {
    lines.push(
      `- [${destination.name}](${SITE_URL}${canonicalDestinationPath(destination)})`,
    )
  }
  lines.push("")

  const policy = trips.find((t) => t.cancelation_policy)?.cancelation_policy
  if (policy) {
    lines.push("## Booking and cancellation")
    lines.push(policy)
    lines.push("")
  }

  lines.push("## Pages")
  lines.push(`- [Home](${SITE_URL}/) — overview`)
  lines.push(`- [Trips](${SITE_URL}/trips) — all trips and pricing`)
  lines.push(`- [Destinations](${SITE_URL}/destinations) — meeting points`)
  lines.push(
    `- [FAQ](${SITE_URL}/faq) — common questions (safety, swimming, age, weight limit, what to wear)`,
  )
  lines.push(`- [About](${SITE_URL}/about)`)
  lines.push(`- [Contact](${SITE_URL}/contact)`)

  return lines.join("\n") + "\n"
}

/** Fuller variant: inlines complete trip/destination descriptions. */
export async function buildLlmsFullTxt(): Promise<string> {
  const [trips, destinations] = await Promise.all([
    listPublicTrips("en"),
    listPublicDestinations("en"),
  ])

  const lines: string[] = []
  lines.push(`# ${SITE_NAME} — Full Reference`)
  lines.push("")
  lines.push(
    "> Complete trip and destination details for Duck Entertainment's Nile water " +
      "sports trips in Aswan, Egypt.",
  )
  lines.push("")

  lines.push("## Trips")
  lines.push("")
  for (const trip of trips) {
    lines.push(`### ${trip.name}`)
    lines.push("")
    lines.push(`URL: ${SITE_URL}${canonicalTripPath(trip)}`)
    lines.push(`Book: ${SITE_URL}/book?trip=${trip.id}`)
    lines.push(
      `Price: ${formatCurrency(trip.price, trip.currency, "en")} (Egyptian residents)` +
        (trip.foreigner_price
          ? ` / ${formatCurrency(trip.foreigner_price, trip.currency, "en")} (foreign visitors)`
          : ""),
    )
    lines.push(`Duration: ${trip.duration || 1} hour(s)`)
    lines.push(`Max guests: ${trip.max_guests}`)
    if (trip.description) lines.push(`\n${trip.description}`)
    if (trip.itinerary) lines.push(`\nItinerary:\n${trip.itinerary}`)
    if (trip.availability) lines.push(`\nAvailability:\n${trip.availability}`)
    if (trip.cancelation_policy) {
      lines.push(`\nCancellation policy:\n${trip.cancelation_policy}`)
    }
    lines.push("")
  }

  lines.push("## Destinations")
  lines.push("")
  for (const destination of destinations) {
    lines.push(`### ${destination.name}`)
    lines.push("")
    lines.push(`URL: ${SITE_URL}${canonicalDestinationPath(destination)}`)
    if (destination.description) lines.push(`\n${destination.description}`)
    if (destination.operating_hours) {
      lines.push(`\nOperating hours: ${destination.operating_hours}`)
    }
    lines.push("")
  }

  return lines.join("\n") + "\n"
}
