import { cookies } from "next/headers"
import { getTranslations } from "next-intl/server"
import { formatCurrency } from "@/lib/constants"
import { canonicalDestinationPath, canonicalTripPath } from "@/lib/seo/slug"
import { getFaqEntries } from "@/lib/seo/faq"
import {
  SITE_CONTACT,
  SITE_FACTS,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site"
import { tripDurationText } from "@/lib/trips/duration"
import {
  getDestinationBySlug,
  getTripBySlug,
  listPublicDestinations,
  listPublicTrips,
  type PublicDestination,
  type PublicTrip,
} from "@/server/services/public-content"

export function resolveAgentLocale(value: string | undefined | null): "en" | "ar" {
  return value === "ar" ? "ar" : "en"
}

export async function localeFromCookie(): Promise<"en" | "ar"> {
  const store = await cookies()
  return resolveAgentLocale(store.get("locale")?.value)
}

export function tripDurationLabel(trip: PublicTrip, locale: string): string {
  return tripDurationText(trip, locale) ?? `${trip.duration || 1} hour(s)`
}

export function tripPriceLine(trip: PublicTrip, locale: string): string {
  return trip.foreigner_price
    ? `${formatCurrency(trip.price, trip.currency, locale)} (Egyptian residents) / ${formatCurrency(trip.foreigner_price, trip.currency, locale)} (foreign visitors)`
    : formatCurrency(trip.price, trip.currency, locale)
}

export function formatTripListItem(trip: PublicTrip, locale: string): string {
  return (
    `- [${trip.name}](${SITE_URL}${canonicalTripPath(trip)}): ` +
    `${tripDurationLabel(trip, locale)}, up to ${trip.max_guests} guests. ${tripPriceLine(trip, locale)}. ` +
    `Book: ${SITE_URL}/book?trip=${trip.id}`
  )
}

export function formatTripDetail(trip: PublicTrip, locale: string): string {
  const lines: string[] = []
  lines.push(`### ${trip.name}`)
  lines.push("")
  lines.push(`URL: ${SITE_URL}${canonicalTripPath(trip)}`)
  lines.push(`Book: ${SITE_URL}/book?trip=${trip.id}`)
  lines.push(
    `Price: ${formatCurrency(trip.price, trip.currency, locale)} (Egyptian residents)` +
      (trip.foreigner_price
        ? ` / ${formatCurrency(trip.foreigner_price, trip.currency, locale)} (foreign visitors)`
        : ""),
  )
  lines.push(`Duration: ${tripDurationLabel(trip, locale)}`)
  lines.push(`Max guests: ${trip.max_guests}`)
  if (trip.description) lines.push(`\n${trip.description}`)
  if (trip.itinerary) lines.push(`\nItinerary:\n${trip.itinerary}`)
  if (trip.availability) lines.push(`\nAvailability:\n${trip.availability}`)
  if (trip.cancelation_policy) {
    lines.push(`\nCancellation policy:\n${trip.cancelation_policy}`)
  }
  if (trip.meeting_point) lines.push(`\nMeeting point: ${trip.meeting_point}`)
  return lines.join("\n")
}

export function formatDestinationListItem(
  destination: PublicDestination,
): string {
  return `- [${destination.name}](${SITE_URL}${canonicalDestinationPath(destination)})`
}

export function formatDestinationDetail(destination: PublicDestination): string {
  const lines: string[] = []
  lines.push(`### ${destination.name}`)
  lines.push("")
  lines.push(`URL: ${SITE_URL}${canonicalDestinationPath(destination)}`)
  if (destination.description) lines.push(`\n${destination.description}`)
  if (destination.operating_hours) {
    lines.push(`\nOperating hours: ${destination.operating_hours}`)
  }
  if (destination.lat != null && destination.lng != null) {
    lines.push(`\nCoordinates: ${destination.lat}, ${destination.lng}`)
  }
  if (destination.activities.length) {
    lines.push(`\nActivities: ${destination.activities.join(", ")}`)
  }
  return lines.join("\n")
}

export function keyFactsLines(): string[] {
  return [
    `Location: ${SITE_CONTACT.street}, ${SITE_CONTACT.city}, ${SITE_CONTACT.country}`,
    `Hours: ${SITE_FACTS.hours}`,
    SITE_FACTS.pricing,
    `Payment: ${SITE_FACTS.payment}`,
    `Contact: ${SITE_CONTACT.phone} · ${SITE_CONTACT.email}`,
    `Languages: ${SITE_FACTS.languages.join(", ")}`,
  ]
}

function joinMarkdown(lines: string[]): string {
  return lines.join("\n") + "\n"
}

async function buildHomeMarkdown(locale: string): Promise<string> {
  const [trips, destinations, faqs] = await Promise.all([
    listPublicTrips(locale),
    listPublicDestinations(locale),
    getFaqEntries(),
  ])

  const lines: string[] = []
  lines.push(`# ${SITE_NAME}`)
  lines.push("")
  lines.push(
    "Kayaking and water sports on the Nile in Aswan, Egypt. Booked online or by WhatsApp.",
  )
  lines.push("")
  lines.push("## Key facts")
  for (const fact of keyFactsLines()) lines.push(`- ${fact}`)
  lines.push("")
  lines.push("## Trips")
  for (const trip of trips) lines.push(formatTripListItem(trip, locale))
  lines.push("")
  lines.push("## Destinations")
  for (const destination of destinations) {
    lines.push(formatDestinationListItem(destination))
  }
  lines.push("")
  if (faqs.length) {
    lines.push("## FAQ")
    lines.push("")
    for (const faq of faqs.slice(0, 6)) {
      lines.push(`### ${faq.question}`)
      lines.push("")
      lines.push(faq.answer)
      lines.push("")
    }
    lines.push(`Full FAQ: ${SITE_URL}/faq`)
    lines.push("")
  }
  lines.push("## Pages")
  lines.push(`- [Trips](${SITE_URL}/trips)`)
  lines.push(`- [Destinations](${SITE_URL}/destinations)`)
  lines.push(`- [Book](${SITE_URL}/book)`)
  lines.push(`- [Contact](${SITE_URL}/contact)`)
  lines.push(`- [API](${SITE_URL}/docs/api)`)
  return joinMarkdown(lines)
}

async function buildTripsMarkdown(locale: string): Promise<string> {
  const trips = await listPublicTrips(locale)
  const lines: string[] = [`# Trips`, ""]
  lines.push(
    "Nile water-sports trips with Duck Entertainment in Aswan. Prices in EGP.",
  )
  lines.push("")
  for (const trip of trips) lines.push(formatTripListItem(trip, locale))
  return joinMarkdown(lines)
}

async function buildTripMarkdown(
  slug: string,
  locale: string,
): Promise<string | null> {
  const trip = await getTripBySlug(slug, locale)
  if (!trip) return null
  return joinMarkdown([`# ${trip.name}`, "", formatTripDetail(trip, locale), ""])
}

async function buildDestinationsMarkdown(locale: string): Promise<string> {
  const destinations = await listPublicDestinations(locale)
  const lines: string[] = [`# Destinations`, ""]
  lines.push("Meeting points on the Nile in Aswan.")
  lines.push("")
  for (const destination of destinations) {
    lines.push(formatDestinationListItem(destination))
  }
  return joinMarkdown(lines)
}

async function buildDestinationMarkdown(
  slug: string,
  locale: string,
): Promise<string | null> {
  const destination = await getDestinationBySlug(slug, locale)
  if (!destination) return null
  const trips = await listPublicTrips(locale)
  const here = trips.filter((trip) =>
    trip.destinations.some((d) => d.id === destination.id),
  )
  const lines = [
    `# ${destination.name}`,
    "",
    formatDestinationDetail(destination),
    "",
  ]
  if (here.length) {
    lines.push("## Trips here")
    lines.push("")
    for (const trip of here) lines.push(formatTripListItem(trip, locale))
    lines.push("")
  }
  return joinMarkdown(lines)
}

async function buildFaqMarkdown(): Promise<string> {
  const t = await getTranslations("faq")
  const tPage = await getTranslations("faqPage")
  const entries = await getFaqEntries()
  const lines: string[] = [`# ${tPage("title")}`, "", t("description"), ""]
  for (const entry of entries) {
    lines.push(`## ${entry.question}`)
    lines.push("")
    lines.push(entry.answer)
    lines.push("")
  }
  return joinMarkdown(lines)
}

async function buildAboutMarkdown(): Promise<string> {
  const t = await getTranslations("about")
  return joinMarkdown([
    `# ${t("heroTitle")}`,
    "",
    t("heroDescription"),
    "",
    `## ${t("visionTitle")}`,
    "",
    t("visionBody"),
    "",
    `## ${t("missionTitle")}`,
    "",
    t("missionBody"),
    "",
    `## ${t("promiseTitle")}`,
    "",
    t("promiseBody"),
    "",
  ])
}

function buildContactMarkdown(): string {
  return joinMarkdown([
    `# Contact`,
    "",
    `${SITE_NAME} — Nile Corniche, Aswan, Egypt.`,
    "",
    `- Phone / WhatsApp: ${SITE_CONTACT.phone}`,
    `- Email: ${SITE_CONTACT.email}`,
    `- Map: ${SITE_CONTACT.mapUrl}`,
    `- Instagram: ${SITE_CONTACT.social[0]}`,
    `- Facebook: ${SITE_CONTACT.social[1]}`,
    "",
    `Hours: ${SITE_FACTS.hours}`,
    `Payment: ${SITE_FACTS.payment}`,
    "",
  ])
}

function buildBookMarkdown(): string {
  return joinMarkdown([
    `# Book a trip`,
    "",
    `Pick a trip on ${SITE_URL}/trips, then open ${SITE_URL}/book?trip=<id>.`,
    "",
    "The form asks for name, phone, date, guest counts (Egyptian residents vs foreign visitors), equipment (kayak, water cycle, or SUP), and payment by InstaPay or cash.",
    "",
    "There is no card gateway. Automated agents should hand the user to the form rather than collecting payment.",
    "",
    ...keyFactsLines().map((line) => `- ${line}`),
    "",
  ])
}

async function buildMapMarkdown(locale: string): Promise<string> {
  const destinations = await listPublicDestinations(locale)
  const lines: string[] = [
    `# Map`,
    "",
    "Meeting points for Duck Entertainment trips on the Nile in Aswan.",
    "",
  ]
  for (const destination of destinations) {
    lines.push(formatDestinationDetail(destination))
    lines.push("")
  }
  return joinMarkdown(lines)
}

function buildApiDocsMarkdown(): string {
  return joinMarkdown([
    `# API for agents`,
    "",
    "Read-only catalogue of Nile water-sports trips. Booking is a handoff to the website.",
    "",
    `- OpenAPI: ${SITE_URL}/openapi.json`,
    `- MCP: ${SITE_URL}/api/mcp`,
    `- Auth: ${SITE_URL}/auth.md`,
    `- Health: ${SITE_URL}/api/health`,
    "",
    "Public GET endpoints need no token: `/api/v1/trips`, `/api/v1/destinations`, `/api/v1/suppliers`, `/api/v1/tour-guides`.",
    "",
    "MCP tools: `search_trips`, `get_trip`, `list_destinations`, `check_availability`, `get_business_info`. No write tools.",
    "",
  ])
}

/**
 * Builds markdown for a public content path. Returns null when the path is
 * not a known page or the slug does not resolve.
 */
export async function markdownForPath(
  segments: string[],
  locale: string,
): Promise<string | null> {
  const [head, ...rest] = segments

  if (!head) return buildHomeMarkdown(locale)

  if (head === "trips" && rest.length === 0) return buildTripsMarkdown(locale)
  if (head === "trips" && rest.length === 1) {
    return buildTripMarkdown(rest[0], locale)
  }

  if (head === "destinations" && rest.length === 0) {
    return buildDestinationsMarkdown(locale)
  }
  if (head === "destinations" && rest.length === 1) {
    return buildDestinationMarkdown(rest[0], locale)
  }

  if (head === "faq" && rest.length === 0) return buildFaqMarkdown()
  if (head === "about" && rest.length === 0) return buildAboutMarkdown()
  if (head === "contact" && rest.length === 0) return buildContactMarkdown()
  if (head === "book" && rest.length === 0) return buildBookMarkdown()
  if (head === "map" && rest.length === 0) return buildMapMarkdown(locale)
  if (head === "docs" && rest.length === 1 && rest[0] === "api") {
    return buildApiDocsMarkdown()
  }

  return null
}
