import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound, permanentRedirect } from "next/navigation"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ImageWithLogoFallback } from "@/components/shared/image-with-logo-fallback"
import Footer from "@/components/landing/Footer"
import { JsonLd } from "@/components/seo/json-ld"
import { buildBreadcrumbJsonLd, buildDestinationJsonLd } from "@/lib/seo/json-ld"
import {
  canonicalDestinationPath,
  canonicalTripPath,
  destinationSlug,
  extractObjectId,
} from "@/lib/seo/slug"
import {
  getDestinationBySlug,
  listPublicTrips,
  type PublicDestination,
} from "@/server/services/public-content"
import { formatCurrency } from "@/lib/constants"
import { SITE_CONTACT, SITE_NAME, SITE_URL } from "@/lib/site"
import { buildWhatsAppHref } from "@/lib/support-contact"
import { Phone } from "lucide-react"

interface PageProps {
  params: Promise<{ slug: string }>
}

async function resolveDestination(
  slug: string,
  locale: string,
): Promise<PublicDestination> {
  const destination = await getDestinationBySlug(slug, locale)
  if (!destination) notFound()

  const canonicalSlug = destinationSlug(destination)
  const requestedId = extractObjectId(slug)
  if (requestedId && slug !== canonicalSlug) {
    permanentRedirect(canonicalDestinationPath(destination))
  }

  return destination
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  const destination = await getDestinationBySlug(slug, locale)
  if (!destination) return {}

  const t = await getTranslations("destinationPage")
  const path = canonicalDestinationPath(destination)
  const description = t("metaDescription", { name: destination.name })

  return {
    title: t("metaTitle", { name: destination.name }),
    description,
    alternates: { canonical: path },
    openGraph: {
      title: t("metaTitle", { name: destination.name }),
      description,
      url: path,
      images: destination.image
        ? [destination.image.startsWith("http") ? destination.image : `${SITE_URL}${destination.image}`]
        : undefined,
    },
  }
}

export default async function DestinationDetailPage({ params }: PageProps) {
  const { slug } = await params
  const locale = await getLocale()
  const destination = await resolveDestination(slug, locale)
  const t = await getTranslations("destinationPage")
  const tMap = await getTranslations("mapPage")

  const path = canonicalDestinationPath(destination)
  const pageUrl = `${SITE_URL}${path}`

  const activityLabels: Record<string, string> = {
    kayak: tMap("filters.kayak"),
    sup: tMap("filters.sup"),
    waterbike: tMap("filters.waterbike"),
    water_cycle: tMap("filters.waterbike"),
  }

  const allTrips = await listPublicTrips(locale)
  const trips = allTrips.filter((trip) =>
    trip.destinations.some((d) => d.id === destination.id),
  )

  const summary = t("summary", { name: destination.name, siteName: SITE_NAME })

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: t("breadcrumbHome"), url: SITE_URL },
      { name: t("breadcrumbDestinations"), url: `${SITE_URL}/destinations` },
      { name: destination.name, url: pageUrl },
    ],
    pageUrl,
  )
  const destinationJsonLd = buildDestinationJsonLd(destination)
  const pageGraph = {
    "@context": "https://schema.org",
    "@graph": [breadcrumbJsonLd, destinationJsonLd],
  }

  const whatsappHref = buildWhatsAppHref(
    `Hi, I'd like to ask about ${destination.name}.`,
  )

  const allImages = destination.image
    ? [destination.image, ...destination.images.filter((i) => i !== destination.image)]
    : destination.images

  return (
    <>
      <JsonLd data={pageGraph} />

      <section className="bg-duck-navy pt-28 md:pt-40 pb-10 px-4 md:px-10">
        <div className="max-w-4xl mx-auto">
          <Breadcrumb className="mb-6">
            <BreadcrumbList className="text-white/60">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" className="hover:text-white">
                    {t("breadcrumbHome")}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/destinations" className="hover:text-white">
                    {t("breadcrumbDestinations")}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white">
                  {destination.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-white text-3xl md:text-5xl font-bold mb-5">
            {destination.name}
          </h1>
          <p className="text-white/80 text-base md:text-lg leading-relaxed max-w-3xl">
            {summary}
          </p>
        </div>
      </section>

      <section className="bg-white pt-10 pb-4 px-4 md:px-10">
        <div className="max-w-4xl mx-auto">
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100">
            <ImageWithLogoFallback
              src={allImages[0] ?? null}
              alt={destination.name}
              fill
              priority
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-10 px-4 md:px-10">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-10">
          <div className="md:col-span-2 space-y-10">
            {destination.description && (
              <div>
                <p className="text-text-body leading-relaxed whitespace-pre-line">
                  {destination.description}
                </p>
              </div>
            )}

            {destination.activities.length > 0 && (
              <div>
                <h2 className="text-text-dark text-xl font-bold mb-3">
                  {t("activitiesTitle")}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {destination.activities.map((activity) => (
                    <span
                      key={activity}
                      className="rounded-full bg-duck-cyan/10 text-duck-cyan text-sm font-medium px-4 py-1.5"
                    >
                      {activityLabels[activity] ?? activity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-text-dark text-xl font-bold mb-4">
                {t("tripsTitle")}
              </h2>
              {trips.length === 0 ? (
                <p className="text-text-body text-sm">{t("noTrips")}</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {trips.map((trip) => (
                    <Link
                      key={trip.id}
                      href={canonicalTripPath(trip)}
                      className="rounded-xl bg-off-white border border-black/5 p-5 hover:border-duck-cyan/25 hover:shadow-sm transition-all"
                    >
                      <h3 className="text-text-dark font-semibold mb-1.5">
                        {trip.name}
                      </h3>
                      <span className="text-duck-cyan font-semibold text-sm">
                        {formatCurrency(trip.price, trip.currency, locale)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside>
            <div className="sticky top-24 rounded-2xl bg-off-white border border-black/5 p-6 space-y-5">
              <div>
                <h2 className="text-text-dark font-semibold mb-2">
                  {t("locationTitle")}
                </h2>
                <p className="text-text-body text-sm mb-3">
                  {SITE_CONTACT.city}, {SITE_CONTACT.country}
                </p>
                <a
                  href={SITE_CONTACT.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-duck-cyan font-medium text-sm hover:underline"
                >
                  {t("directionsCta")}
                </a>
              </div>

              {destination.operating_hours && (
                <div>
                  <h2 className="text-text-dark font-semibold mb-2">
                    {t("hoursTitle")}
                  </h2>
                  <p className="text-text-body text-sm whitespace-pre-line">
                    {destination.operating_hours}
                  </p>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center rounded-full bg-duck-yellow px-5 py-3 text-sm font-semibold text-duck-navy hover:bg-duck-yellow-hover transition-colors"
                >
                  {t("ctaWhatsapp")}
                </a>
                <a
                  href={`tel:${SITE_CONTACT.phone}`}
                  className="flex items-center justify-center gap-2 w-full text-center rounded-full border border-duck-navy/20 px-5 py-3 text-sm font-semibold text-duck-navy hover:bg-white transition-colors"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {t("ctaCall")}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </>
  )
}
