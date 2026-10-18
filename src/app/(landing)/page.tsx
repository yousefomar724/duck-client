import { Suspense } from "react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import HeroSection from "@/components/landing/HeroSection"
import ResortsSection from "@/components/landing/ResortsSection"
import OffersSection from "@/components/landing/OffersSection"
import LocationSection from "@/components/landing/LocationSection"
import ReviewsSection from "@/components/landing/ReviewsSection"
import FAQSection from "@/components/landing/FAQSection"
import Footer from "@/components/landing/Footer"
import { JsonLd } from "@/components/seo/json-ld"
import { buildFaqJsonLd, getFaqEntries } from "@/lib/seo/faq"
import { SITE_URL } from "@/lib/site"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home.metadata")
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/" },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "/",
    },
  }
}

async function FaqStructuredData() {
  const faqEntries = await getFaqEntries()
  return <JsonLd data={buildFaqJsonLd(faqEntries, SITE_URL)} />
}

// Not async on purpose. Awaiting anything here suspends the whole page, so the
// first HTML flush carried (landing)/loading.tsx's skeleton and the hero only
// arrived in a later chunk — on a phone that was most of the LCP time.
export default function Home() {
  return (
    <>
      <Suspense fallback={null}>
        <FaqStructuredData />
      </Suspense>
      {/* The hero's poster frame is the LCP element. A <video poster> is fetched
          at default priority and cannot carry fetchpriority itself, so preload it
          here — React hoists this into <head>. Keep the href in step with
          HeroSection's poster prop. */}
      <link
        rel="preload"
        as="image"
        href="/videos/hero-v2-poster-v1.avif"
        type="image/avif"
        fetchPriority="high"
      />
      <HeroSection />
      <ResortsSection />
      <OffersSection />
      <LocationSection />
      <ReviewsSection />
      <FAQSection />
      <Footer />
    </>
  )
}
