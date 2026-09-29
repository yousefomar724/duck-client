import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import Link from "next/link"
import { MapPin } from "lucide-react"
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
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld"
import { canonicalTripPath } from "@/lib/seo/slug"
import { listPublicTrips } from "@/server/services/public-content"
import { formatCurrency } from "@/lib/constants"
import { SITE_URL } from "@/lib/site"
import { cn } from "@/lib/utils"
import {
  matchesTripListingFilter,
  parseTripListingFilter,
  tripListingHref,
  type TripListingFilter,
} from "@/lib/trips/listing-filter"
import { tripLocationLabel } from "@/lib/trips/location"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tripsPage.metadata")
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/trips" },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "/trips",
    },
  }
}

/** Chip order on the page; each maps to exactly one `/trips?...` URL. */
const FILTER_CHIPS: { key: string; filter: TripListingFilter }[] = [
  { key: "all", filter: {} },
  { key: "trip", filter: { type: "trip" } },
  { key: "tour", filter: { type: "tour" } },
  { key: "kayak", filter: { activity: "kayak" } },
  { key: "sup", filter: { activity: "sup" } },
  { key: "waterbike", filter: { activity: "waterbike" } },
]

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function TripsPage({ searchParams }: PageProps) {
  const locale = await getLocale()
  const t = await getTranslations("tripsPage")
  const filter = parseTripListingFilter(await searchParams)
  const activeHref = tripListingHref(filter)
  const allTrips = await listPublicTrips(locale)
  const trips = allTrips.filter((trip) => matchesTripListingFilter(trip, filter))
  const isFiltered = Boolean(filter.type || filter.activity)
  const pageUrl = `${SITE_URL}/trips`

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: t("breadcrumbHome"), url: SITE_URL },
      { name: t("breadcrumbTrips"), url: pageUrl },
    ],
    pageUrl,
  )

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />

      <section className="bg-duck-navy pt-28 md:pt-44 pb-16 px-4 md:px-10">
        <div className="max-w-5xl mx-auto">
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
                <BreadcrumbPage className="text-white">
                  {t("breadcrumbTrips")}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-white text-4xl md:text-5xl font-bold mb-5">
            {t("title")}
          </h1>
          <p className="text-white/70 text-base md:text-lg leading-relaxed max-w-2xl">
            {t("description")}
          </p>
        </div>
      </section>

      <section className="bg-white py-16 px-4 md:px-10">
        <div className="max-w-5xl mx-auto">
          <nav
            aria-label={t("filtersLabel")}
            className="-mx-4 px-4 md:mx-0 md:px-0 mb-8 overflow-x-auto [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            <ul className="flex w-max gap-2">
              {FILTER_CHIPS.map(({ key, filter: chipFilter }) => {
                const href = tripListingHref(chipFilter)
                const active = href === activeHref
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      scroll={false}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                        active
                          ? "border-duck-navy bg-duck-navy text-white"
                          : "border-black/10 bg-off-white text-text-dark hover:border-duck-cyan/40",
                      )}
                    >
                      {t(`filters.${key}`)}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {trips.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-body">
                {isFiltered && allTrips.length > 0
                  ? t("noFilteredTrips")
                  : t("noTrips")}
              </p>
              {isFiltered && allTrips.length > 0 ? (
                <Link
                  href="/trips"
                  className="mt-4 inline-flex rounded-full bg-duck-yellow px-5 py-2.5 text-sm font-semibold text-duck-navy hover:bg-duck-yellow/80 transition-colors"
                >
                  {t("showAll")}
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {trips.map((trip) => {
                const price = trip.foreigner_price || trip.price
                const location = tripLocationLabel(
                  trip.destinations.map((d) => d.name),
                  trip.meeting_point,
                  locale === "ar" ? "، " : ", ",
                )
                return (
                  <Link
                    key={trip.id}
                    href={canonicalTripPath(trip)}
                    className="group rounded-2xl bg-off-white border border-black/5 overflow-hidden hover:border-duck-cyan/25 hover:shadow-md transition-all duration-300"
                  >
                    <div className="relative aspect-[16/9] bg-gray-100">
                      <ImageWithLogoFallback
                        src={trip.images[0] ?? null}
                        alt={trip.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span
                        className={cn(
                          "absolute top-3 start-3 rounded-full px-3 py-1 text-xs font-medium",
                          trip.is_tour
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700",
                        )}
                      >
                        {trip.is_tour ? t("tour") : t("trip")}
                      </span>
                      {trip.public_status === "coming-soon" ? (
                        <span className="absolute top-3 end-3 rounded-full bg-duck-yellow px-3 py-1 text-xs font-semibold text-duck-navy">
                          {t("comingSoon")}
                        </span>
                      ) : null}
                      {location ? (
                        <span
                          className="absolute bottom-3 start-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
                          title={location}
                        >
                          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                          <span className="sr-only">{t("locationLabel")}: </span>
                          <span className="truncate">{location}</span>
                        </span>
                      ) : null}
                    </div>
                    <div className="p-6">
                      <h2 className="text-text-dark text-xl font-bold mb-2">
                        {trip.name}
                      </h2>
                      <p className="text-text-body text-sm leading-relaxed line-clamp-2 mb-4">
                        {trip.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-duck-cyan font-semibold">
                          {t("fromPrice", {
                            price: formatCurrency(price, trip.currency, locale),
                          })}
                        </span>
                        <span className="text-sm font-medium text-duck-navy group-hover:underline">
                          {t("viewDetails")}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  )
}
