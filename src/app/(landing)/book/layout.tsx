import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { JsonLd } from "@/components/seo/json-ld"
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld"
import { SITE_URL } from "@/lib/site"

/** The page itself is a client component, so metadata lives here. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("book.metadata")
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/book" },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "/book",
    },
  }
}

export default async function BookLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations()
  const pageUrl = `${SITE_URL}/book`
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: t("common.home"), url: SITE_URL },
      { name: t("navbar.book"), url: pageUrl },
    ],
    pageUrl,
  )

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...breadcrumbJsonLd }} />
      {children}
    </>
  )
}
