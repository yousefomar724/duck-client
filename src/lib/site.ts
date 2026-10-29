/**
 * The apex host 308-redirects to www. Canonicals, the sitemap, robots, and
 * JSON-LD have to name the host that returns 200. Pointing them at the apex
 * makes Google treat the live www pages as alternates of a redirect.
 */
const CANONICAL_PRODUCTION_HOST = "www.duckegy.com"

/**
 * Canonical origin for the public site.
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_SITE_URL — set this in .env.local / Vercel for the real domain.
 *  2. VERCEL_PROJECT_PRODUCTION_URL — provided automatically by Vercel.
 *  3. localhost fallback for local development.
 *
 * Used by `metadataBase`, canonical tags, robots.txt and sitemap.xml so that
 * every absolute URL in the app comes from a single place.
 */
export function canonicalSiteOrigin(raw: string): string {
  const withScheme = raw.includes("://") ? raw : `https://${raw}`
  const url = new URL(withScheme)
  if (url.hostname === "duckegy.com") {
    url.hostname = CANONICAL_PRODUCTION_HOST
    url.protocol = "https:"
  }
  return url.origin
}

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) {
    try {
      return canonicalSiteOrigin(explicit)
    } catch {
      /* fall through */
    }
  }

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) {
    try {
      return canonicalSiteOrigin(vercel)
    } catch {
      /* fall through */
    }
  }

  return "http://localhost:3000"
}

export const SITE_URL = resolveSiteUrl()

export const SITE_NAME = "Duck Entertainment"

/** Business details shared between the footer, contact page and JSON-LD. */
export const SITE_CONTACT = {
  phone: "+201550061006",
  email: "duck.asw@gmail.com",
  street: "Nile Corniche",
  city: "Aswan",
  country: "EG",
  mapUrl: "https://maps.app.goo.gl/FPt8JJ8VgaTTzBir6",
  social: [
    "https://www.instagram.com/duck.asw/",
    "https://www.facebook.com/duck.asw/",
  ],
} as const

/** Operational facts shared by llms.txt, agent markdown, and MCP. */
export const SITE_FACTS = {
  hours: "daily, sunrise to sunset, by advance booking",
  pricing:
    "Prices in EGP, two tiers: Egyptian residents and foreign visitors",
  payment: "InstaPay or cash. No card gateway.",
  languages: ["Arabic", "English"] as const,
} as const

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}
