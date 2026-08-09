import MapPageClient from "@/components/map/MapPageClient"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { JsonLd } from "@/components/seo/json-ld"
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld"
import { SITE_URL } from "@/lib/site"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mapPage.metadata")
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/map" },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "/map",
    },
  }
}

export default async function MapPage() {
  const t = await getTranslations()
  const pageUrl = `${SITE_URL}/map`
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: t("common.home"), url: SITE_URL },
      { name: t("navbar.map"), url: pageUrl },
    ],
    pageUrl,
  )

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...breadcrumbJsonLd }} />
      <MapPageClient />
    </>
  )
}
