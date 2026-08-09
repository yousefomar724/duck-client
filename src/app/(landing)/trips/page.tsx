import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
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
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld"
import { canonicalTripPath } from "@/lib/seo/slug"
import { listPublicTrips } from "@/server/services/public-content"
import { formatCurrency } from "@/lib/constants"
import { SITE_URL } from "@/lib/site"

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

export default async function TripsPage() {
  const locale = await getLocale()
  const t = await getTranslations("tripsPage")
  const trips = await listPublicTrips(locale)
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
          {trips.length === 0 ? (
            <p className="text-text-body text-center py-12">{t("noTrips")}</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {trips.map((trip) => {
                const price = trip.foreigner_price || trip.price
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
