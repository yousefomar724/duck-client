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
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) {
    const raw = explicit.includes("://") ? explicit : `https://${explicit}`
    try {
      return new URL(raw).origin
    } catch {
      /* fall through */
    }
  }

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`

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
