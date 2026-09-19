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
import { TripListingPrices } from "@/components/shared/trip-listing-prices"
import Footer from "@/components/landing/Footer"
import { TripImageGallery } from "@/components/landing/trip-image-gallery"
import { JsonLd } from "@/components/seo/json-ld"
import {
  buildBreadcrumbJsonLd,
  buildDestinationJsonLd,
  buildDestinationTripsJsonLd,
  buildTripJsonLd,
} from "@/lib/seo/json-ld"
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
import { tripDurationText } from "@/lib/trips/duration"
import { tripPriceRange } from "@/lib/trips/price-range"
import { SITE_CONTACT, SITE_NAME, SITE_URL } from "@/lib/site"
import { buildWhatsAppHref } from "@/lib/support-contact"
import { Clock, Phone, Users } from "lucide-react"
import { buildGoogleMapsUrl } from "@/lib/maps"

interface PageProps {
  params: Promise<{ slug: string }>
}

const URL_PATTERN = /(https?:\/\/[^\s<]+)/g

function LinkifiedDescription({ text }: { text: string }) {
  return text.split(URL_PATTERN).map((part, index) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={`${part}-${index}`}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-duck-cyan underline decoration-duck-cyan/40 underline-offset-2 break-all hover:decoration-duck-cyan"
      >
        {part}
      </a>
    ) : (
      part
    ),
  )
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
  const tOffers = await getTranslations("offers")

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

  // Both tiers are minimised across this destination's trips, so the page can
  // answer "how much for a foreigner?" without opening a single trip.
  const priceRange = tripPriceRange(trips)
  const priceLead = priceRange
    ? priceRange.foreignerFrom != null
      ? t("priceLeadDual", {
          priceLocal: formatCurrency(
            priceRange.localFrom,
            priceRange.currency,
            locale,
          ),
          priceForeign: formatCurrency(
            priceRange.foreignerFrom,
            priceRange.currency,
            locale,
          ),
        })
      : t("priceLeadSingle", {
          priceLocal: formatCurrency(
            priceRange.localFrom,
            priceRange.currency,
            locale,
          ),
        })
    : null

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
    "@graph": [
      breadcrumbJsonLd,
      destinationJsonLd,
      ...(trips.length
        ? [
            buildDestinationTripsJsonLd(destination, trips, t("tripsTitle")),
            ...trips.map(buildTripJsonLd),
          ]
        : []),
    ],
  }

  const whatsappHref = buildWhatsAppHref(
    `Hi, I'd like to ask about ${destination.name}.`,
  )

  const allImages = destination.image
    ? [destination.image, ...destination.images.filter((i) => i !== destination.image)]
    : destination.images
  const directionsHref =
    destination.lat != null && destination.lng != null
      ? buildGoogleMapsUrl(destination.lat, destination.lng)
      : SITE_CONTACT.mapUrl

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
          {destination.public_status === "coming-soon" ? (
            <span className="mb-5 inline-flex rounded-full bg-duck-yellow px-4 py-1.5 text-sm font-semibold text-duck-navy">
              {t("comingSoon")}
            </span>
          ) : null}
          <p className="text-white/80 text-base md:text-lg leading-relaxed max-w-3xl">
            {summary}
          </p>
          {priceLead ? (
            <p className="mt-3 text-white/70 text-sm md:text-base leading-relaxed max-w-3xl">
              {priceLead}
            </p>
          ) : null}
        </div>
      </section>

      <section className="bg-white pt-10 pb-4 px-4 md:px-10">
        <div className="max-w-4xl mx-auto min-w-0">
          <TripImageGallery images={allImages} alt={destination.name} />
        </div>
      </section>

      <section className="bg-white py-10 px-4 md:px-10">
        <div className="max-w-4xl mx-auto grid min-w-0 md:grid-cols-3 gap-10">
          <div className="min-w-0 md:col-span-2 space-y-10">
            {destination.description && (
              <div className="min-w-0 overflow-hidden">
                <p className="text-text-body leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]">
                  <LinkifiedDescription text={destination.description} />
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
                <div className="grid sm:grid-cols-2 gap-5">
                  {trips.map((trip) => {
                    const durationText = tripDurationText(trip, locale)
                    const durationLabel = durationText
                      ? t("tripDurationText", { duration: durationText })
                      : trip.duration > 0
                        ? t("tripDuration", { duration: trip.duration })
                        : null
                    return (
                      <article
                        key={trip.id}
                        className="overflow-hidden rounded-2xl bg-off-white border border-black/5"
                      >
                        <Link href={canonicalTripPath(trip)} className="group block">
                          <div className="relative aspect-16/9 bg-gray-100">
                            <ImageWithLogoFallback
                              src={trip.images[0] ?? null}
                              alt={trip.name}
                              fill
                              sizes="(max-width: 640px) 100vw, 360px"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {trip.public_status === "coming-soon" ? (
                              <span className="absolute top-3 end-3 rounded-full bg-duck-yellow px-3 py-1 text-xs font-semibold text-duck-navy">
                                {t("comingSoon")}
                              </span>
                            ) : null}
                          </div>
                          <div className="p-5">
                            <h3 className="text-text-dark font-semibold mb-1.5 break-words">
                              {trip.name}
                            </h3>
                            <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-text-body">
                              {trip.description}
                            </p>
                            {(durationLabel || trip.max_guests > 0) && (
                              <ul className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
                                {durationLabel ? (
                                  <li className="inline-flex items-center gap-1.5">
                                    <Clock className="size-3.5" aria-hidden="true" />
                                    {durationLabel}
                                  </li>
                                ) : null}
                                {trip.max_guests > 0 ? (
                                  <li className="inline-flex items-center gap-1.5">
                                    <Users className="size-3.5" aria-hidden="true" />
                                    {t("tripMaxGuests", { count: trip.max_guests })}
                                  </li>
                                ) : null}
                              </ul>
                            )}
                            <div className="flex flex-wrap items-end justify-between gap-3">
                              <TripListingPrices
                                trip={trip}
                                egyptiansOfferLabel={tOffers(
                                  "egyptiansSpecialOffer",
                                  {
                                    price: formatCurrency(
                                      trip.price,
                                      trip.currency,
                                      locale,
                                    ),
                                  },
                                )}
                                perHourSuffix={
                                  trip.is_tour ? tOffers("perHour") : undefined
                                }
                                mainPriceClassName="text-sm"
                                locale={locale}
                              />
                              <span className="text-sm font-medium text-duck-navy group-hover:underline">
                                {t("viewTrip")}
                              </span>
                            </div>
                          </div>
                        </Link>
                        {trip.public_status !== "coming-soon" ? (
                          <div className="px-5 pb-5">
                            <Link
                              href={`/book?trip=${trip.id}`}
                              className="block rounded-full bg-duck-yellow px-4 py-2.5 text-center text-sm font-semibold text-duck-navy hover:bg-duck-yellow-hover"
                            >
                              {t("bookTrip")}
                            </Link>
                          </div>
                        ) : null}
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <aside className="min-w-0">
            <div className="sticky top-24 rounded-2xl bg-off-white border border-black/5 p-6 space-y-5">
              {priceRange ? (
                <div>
                  <h2 className="text-text-dark font-semibold mb-2">
                    {t("pricingTitle")}
                  </h2>
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-text-muted">{t("priceEgyptian")}</dt>
                      <dd className="font-semibold text-duck-cyan text-end">
                        {t("fromPrice", {
                          price: formatCurrency(
                            priceRange.localFrom,
                            priceRange.currency,
                            locale,
                          ),
                        })}
                      </dd>
                    </div>
                    {priceRange.foreignerFrom != null ? (
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-text-muted">{t("priceForeign")}</dt>
                        <dd className="font-semibold text-duck-cyan text-end">
                          {t("fromPrice", {
                            price: formatCurrency(
                              priceRange.foreignerFrom,
                              priceRange.currency,
                              locale,
                            ),
                          })}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  <p className="text-text-muted text-xs mt-2 leading-relaxed">
                    {t("pricingNote")}
                  </p>
                </div>
              ) : null}

              <div>
                <h2 className="text-text-dark font-semibold mb-2">
                  {t("locationTitle")}
                </h2>
                <div className="mb-3 space-y-1">
                  <p className="text-text-body text-sm">
                    {SITE_CONTACT.city}, {SITE_CONTACT.country}
                  </p>
                  {destination.lat != null && destination.lng != null ? (
                    <p className="text-text-muted text-xs">
                      {t("coordinatesLabel")}:{" "}
                      <span dir="ltr" className="tabular-nums">
                        {destination.lat.toFixed(5)}, {destination.lng.toFixed(5)}
                      </span>
                    </p>
                  ) : null}
                </div>
                <a
                  href={directionsHref}
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
