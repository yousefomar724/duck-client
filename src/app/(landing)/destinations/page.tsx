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
import { canonicalDestinationPath } from "@/lib/seo/slug"
import { listPublicDestinations } from "@/server/services/public-content"
import { SITE_URL } from "@/lib/site"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("destinationsPage.metadata")
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/destinations" },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "/destinations",
    },
  }
}

export default async function DestinationsPage() {
  const locale = await getLocale()
  const t = await getTranslations("destinationsPage")
  const destinations = await listPublicDestinations(locale)
  const pageUrl = `${SITE_URL}/destinations`

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: t("breadcrumbHome"), url: SITE_URL },
      { name: t("breadcrumbDestinations"), url: pageUrl },
    ],
    pageUrl,
  )

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...breadcrumbJsonLd }} />

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
                  {t("breadcrumbDestinations")}
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
          {destinations.length === 0 ? (
            <p className="text-text-body text-center py-12">
              {t("noDestinations")}
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {destinations.map((destination) => (
                <Link
                  key={destination.id}
                  href={canonicalDestinationPath(destination)}
                  className="group rounded-2xl bg-off-white border border-black/5 overflow-hidden hover:border-duck-cyan/25 hover:shadow-md transition-all duration-300"
                >
                  <div className="relative aspect-[16/9] bg-gray-100">
                    <ImageWithLogoFallback
                      src={destination.image || destination.images[0] || null}
                      alt={destination.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <h2 className="text-text-dark text-xl font-bold mb-2">
                      {destination.name}
                    </h2>
                    <p className="text-text-body text-sm leading-relaxed line-clamp-2 mb-4">
                      {destination.description}
                    </p>
                    <span className="text-sm font-medium text-duck-navy group-hover:underline">
                      {t("viewDetails")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  )
}
