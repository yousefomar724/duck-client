import { SITE_CONTACT, SITE_FACTS, SITE_NAME, SITE_URL } from "@/lib/site"
import {
  formatDestinationDetail,
  formatDestinationListItem,
  formatTripDetail,
  formatTripListItem,
} from "@/lib/seo/markdown"
import {
  listPublicDestinations,
  listPublicTrips,
} from "@/server/services/public-content"

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
    "> Kayaking and water sports on the Nile in Aswan, Egypt. " +
      "Booked online or by WhatsApp.",
  )
  lines.push("")

  lines.push("## Key facts")
  lines.push(
    `- Location: ${SITE_CONTACT.street}, ${SITE_CONTACT.city}, ${SITE_CONTACT.country}`,
  )
  lines.push(`- Hours: ${SITE_FACTS.hours}`)
  lines.push(`- ${SITE_FACTS.pricing}`)
  lines.push(`- Payment: ${SITE_FACTS.payment}`)
  lines.push(`- Contact: ${SITE_CONTACT.phone} · ${SITE_CONTACT.email}`)
  lines.push(`- Languages: ${SITE_FACTS.languages.join(", ")}`)
  lines.push("")

  lines.push("## Trips")
  for (const trip of trips) {
    lines.push(formatTripListItem(trip, "en"))
  }
  lines.push("")

  lines.push("## Where you meet us")
  for (const destination of destinations) {
    lines.push(formatDestinationListItem(destination))
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
    lines.push(formatTripDetail(trip, "en"))
    lines.push("")
  }

  lines.push("## Destinations")
  lines.push("")
  for (const destination of destinations) {
    lines.push(formatDestinationDetail(destination))
    lines.push("")
  }

  return lines.join("\n") + "\n"
}
