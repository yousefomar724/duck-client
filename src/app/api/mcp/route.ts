import { createMcpHandler } from "mcp-handler"
import { z } from "zod"
import { canonicalDestinationPath, canonicalTripPath } from "@/lib/seo/slug"
import { tripDurationText } from "@/lib/trips/duration"
import {
  SITE_CONTACT,
  SITE_FACTS,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site"
import { dbConnect } from "@/server/db/connect"
import {
  checkAvailability,
  NoAvailabilityError,
} from "@/server/services/availability"
import {
  getTripBySlug,
  listPublicDestinations,
  listPublicTrips,
  type PublicTrip,
} from "@/server/services/public-content"
import { operatingSlotsForDay } from "@/lib/booking/occupancy"
import { isValidYmd } from "@/lib/time"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const localeSchema = z.enum(["en", "ar"]).optional().default("en")
const resourceTypeSchema = z.enum(["kayak", "water_cycle", "sup"])

function bookUrl(tripId: string): string {
  return `${SITE_URL}/book?trip=${tripId}`
}

function tripSummary(trip: PublicTrip, locale: string) {
  return {
    id: trip.id,
    name: trip.name,
    description: trip.description,
    path: canonicalTripPath(trip),
    book_url: bookUrl(trip.id),
    price: trip.price,
    foreigner_price: trip.foreigner_price || undefined,
    currency: trip.currency,
    duration: tripDurationText(trip, locale) ?? `${trip.duration || 1} hour(s)`,
    max_guests: trip.max_guests,
    destinations: trip.destinations.map((d) => ({ id: d.id, name: d.name })),
    supplier: trip.supplier,
  }
}

function matchesTrip(
  trip: PublicTrip,
  filters: { query?: string; max_price?: number; guests?: number },
): boolean {
  if (filters.query) {
    const q = filters.query.toLowerCase()
    const hay = `${trip.name} ${trip.description} ${trip.itinerary}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  if (filters.max_price != null) {
    const affordable =
      trip.price <= filters.max_price ||
      (trip.foreigner_price > 0 && trip.foreigner_price <= filters.max_price)
    if (!affordable) return false
  }
  if (filters.guests != null && trip.max_guests < filters.guests) return false
  return true
}

function toolResult<T extends Record<string, unknown>>(data: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  }
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "search_trips",
      {
        title: "Search trips",
        description:
          "Search Duck Entertainment Nile water-sports trips. Returns catalogue rows plus a /book?trip=<id> URL. Does not place a booking.",
        inputSchema: z.object({
          query: z
            .string()
            .optional()
            .describe("Optional name or description filter"),
          max_price: z
            .number()
            .optional()
            .describe("Maximum price in EGP (either resident or visitor tier)"),
          guests: z
            .number()
            .int()
            .positive()
            .optional()
            .describe("Minimum max_guests the trip must support"),
          lang: localeSchema.describe("Response language"),
        }),
        outputSchema: z.object({
          count: z.number(),
          trips: z.array(z.record(z.string(), z.unknown())),
        }),
      },
      async ({ query, max_price, guests, lang }) => {
        const trips = await listPublicTrips(lang)
        const matched = trips
          .filter((trip) => matchesTrip(trip, { query, max_price, guests }))
          .map((trip) => tripSummary(trip, lang))
        return toolResult({ count: matched.length, trips: matched })
      },
    )

    server.registerTool(
      "get_trip",
      {
        title: "Get trip",
        description:
          "Get one trip by slug or 24-hex id, including the booking form URL. Read-only.",
        inputSchema: z.object({
          slug: z
            .string()
            .describe("Canonical slug or trailing 24-hex ObjectId"),
          lang: localeSchema.describe("Response language"),
        }),
        outputSchema: z.object({
          found: z.boolean(),
          trip: z.record(z.string(), z.unknown()).nullable(),
          message: z.string().optional(),
        }),
      },
      async ({ slug, lang }) => {
        const trip = await getTripBySlug(slug, lang)
        if (!trip) {
          return toolResult({
            found: false,
            trip: null,
            message: `Trip not found: ${slug}`,
          })
        }
        return toolResult({
          found: true,
          trip: {
            ...tripSummary(trip, lang),
            itinerary: trip.itinerary,
            availability: trip.availability,
            cancelation_policy: trip.cancelation_policy,
            meeting_point: trip.meeting_point,
            map_url: trip.map_url,
            faqs: trip.faqs,
            guide_price: trip.guide_price,
            guide_mandatory: trip.guide_mandatory,
            refundable: trip.refundable,
          },
        })
      },
    )

    server.registerTool(
      "list_destinations",
      {
        title: "List destinations",
        description: "List Nile meeting-point destinations in Aswan.",
        inputSchema: z.object({
          lang: localeSchema.describe("Response language"),
        }),
        outputSchema: z.object({
          count: z.number(),
          destinations: z.array(z.record(z.string(), z.unknown())),
        }),
      },
      async ({ lang }) => {
        const destinations = await listPublicDestinations(lang)
        return toolResult({
          count: destinations.length,
          destinations: destinations.map((d) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            path: canonicalDestinationPath(d),
            operating_hours: d.operating_hours,
            activities: d.activities,
            lat: d.lat,
            lng: d.lng,
          })),
        })
      },
    )

    server.registerTool(
      "check_availability",
      {
        title: "Check availability",
        description:
          "Check whether a trip's supplier has kayak, water-cycle, or SUP capacity on a date. Returns a message on shortage instead of failing the tool.",
        inputSchema: z.object({
          trip: z.string().describe("Trip slug or 24-hex id"),
          date: z.string().describe("Date as YYYY-MM-DD in Africa/Cairo"),
          resource_type: resourceTypeSchema,
          quantity: z.number().int().positive().optional().default(1),
        }),
        outputSchema: z.object({
          available: z.boolean(),
          message: z.string(),
        }),
      },
      async ({ trip: tripRef, date, resource_type, quantity }) => {
        if (!isValidYmd(date)) {
          return toolResult({
            available: false,
            message: "date must be YYYY-MM-DD",
          })
        }

        const trip = await getTripBySlug(tripRef, "en")
        if (!trip) {
          return toolResult({
            available: false,
            message: `Trip not found: ${tripRef}`,
          })
        }
        if (!trip.supplier?.id) {
          return toolResult({
            available: false,
            message: "Trip has no supplier configured",
          })
        }

        await dbConnect()
        try {
          await checkAvailability(
            trip.supplier.id,
            resource_type,
            operatingSlotsForDay(date),
            quantity,
          )
          return toolResult({
            available: true,
            message: `${quantity} ${resource_type}(s) available on ${date} for ${trip.name}`,
          })
        } catch (err) {
          if (err instanceof NoAvailabilityError) {
            return toolResult({ available: false, message: err.message })
          }
          throw err
        }
      },
    )

    server.registerTool(
      "get_business_info",
      {
        title: "Get business info",
        description:
          "Hours, dual EGP pricing tiers, InstaPay/cash payment, languages, and contact for Duck Entertainment.",
        inputSchema: z.object({}),
        outputSchema: z.object({
          name: z.string(),
          url: z.string(),
          phone: z.string(),
          email: z.string(),
          address: z.string(),
          hours: z.string(),
          pricing: z.string(),
          payment: z.string(),
          languages: z.array(z.string()),
          map_url: z.string(),
          social: z.array(z.string()),
        }),
      },
      async () =>
        toolResult({
          name: SITE_NAME,
          url: SITE_URL,
          phone: SITE_CONTACT.phone,
          email: SITE_CONTACT.email,
          address: `${SITE_CONTACT.street}, ${SITE_CONTACT.city}, ${SITE_CONTACT.country}`,
          hours: SITE_FACTS.hours,
          pricing: SITE_FACTS.pricing,
          payment: SITE_FACTS.payment,
          languages: [...SITE_FACTS.languages],
          map_url: SITE_CONTACT.mapUrl,
          social: [...SITE_CONTACT.social],
        }),
    )
  },
  {
    serverInfo: { name: "duckegy", version: "1.0.0" },
    instructions:
      "Read-only access to Duck Entertainment's Nile water-sports trips, destinations, availability and business details. Booking is a handoff to /book?trip=<id>. There are no write tools.",
    capabilities: { tools: { listChanged: false } },
  },
)

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Authorization, mcp-session-id, last-event-id, mcp-protocol-version",
}

async function withCors(request: Request): Promise<Response> {
  const response = await handler(request)
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { ...CORS_HEADERS, "Access-Control-Max-Age": "86400" },
  })
}

export { withCors as GET, withCors as POST, withCors as DELETE }
