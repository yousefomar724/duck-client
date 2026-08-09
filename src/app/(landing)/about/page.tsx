import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import AboutHero from "@/components/about/AboutHero"
import VisionMission from "@/components/about/VisionMission"
import CoreValues from "@/components/about/CoreValues"
import OurGoals from "@/components/about/OurGoals"
import WhyDuck from "@/components/about/WhyDuck"
import OurPromise from "@/components/about/OurPromise"
import Footer from "@/components/landing/Footer"
import { JsonLd } from "@/components/seo/json-ld"
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld"
import { SITE_URL } from "@/lib/site"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about.metadata")
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/about" },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "/about",
    },
  }
}

export default async function AboutPage() {
  const t = await getTranslations()
  const pageUrl = `${SITE_URL}/about`
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: t("common.home"), url: SITE_URL },
      { name: t("navbar.about"), url: pageUrl },
    ],
    pageUrl,
  )

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...breadcrumbJsonLd }} />
      <AboutHero />
      <VisionMission />
      <CoreValues />
      <OurGoals />
      <WhyDuck />
      <OurPromise />
      <Footer />
    </>
  )
}
