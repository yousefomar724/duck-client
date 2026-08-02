/**
 * GA4 measurement ID, or null when analytics must not ship.
 *
 * Preview deployments run with NODE_ENV=production, so Vercel's VERCEL_ENV is
 * the only reliable signal there. VERCEL_ENV is server-only — import this
 * module from server components exclusively, or the check silently inverts.
 */
function resolveGaId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_ID?.trim()
  if (!id) return null

  const vercelEnv = process.env.VERCEL_ENV
  const isProduction = vercelEnv
    ? vercelEnv === "production"
    : process.env.NODE_ENV === "production"

  return isProduction ? id : null
}

export const GA_MEASUREMENT_ID = resolveGaId()
