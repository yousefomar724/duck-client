import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"
import { canonicalDestinationPath, canonicalTripPath } from "@/lib/seo/slug"
import { listPublicDestinations, listPublicTrips } from "@/server/services/public-content"

export const dynamic = "force-dynamic"

const STATIC_ROUTES: Array<{
  path: string
  priority: number
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
}> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/book", priority: 0.9, changeFrequency: "weekly" },
  { path: "/trips", priority: 0.8, changeFrequency: "weekly" },
  { path: "/destinations", priority: 0.7, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
  { path: "/map", priority: 0.7, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/docs/api", priority: 0.4, changeFrequency: "monthly" },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(
    ({ path, priority, changeFrequency }) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    }),
  )

  try {
    const [trips, destinations] = await Promise.all([
      listPublicTrips("en"),
      listPublicDestinations("en"),
    ])

    const tripEntries: MetadataRoute.Sitemap = trips.map((trip) => ({
      url: `${SITE_URL}${canonicalTripPath(trip)}`,
      lastModified: trip.updated_at ? new Date(trip.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.9,
    }))

    const destinationEntries: MetadataRoute.Sitemap = destinations.map((d) => ({
      url: `${SITE_URL}${canonicalDestinationPath(d)}`,
      lastModified: d.updated_at ? new Date(d.updated_at) : now,
      changeFrequency: "monthly",
      priority: 0.7,
    }))

    return [...staticEntries, ...tripEntries, ...destinationEntries]
  } catch {
    // DB unreachable — a partial sitemap beats a 500.
    return staticEntries
  }
}
