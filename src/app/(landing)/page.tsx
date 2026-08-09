import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import HeroSection from "@/components/landing/HeroSection"
import RedSeaSection from "@/components/landing/RedSeaSection"
import AmaalaSection from "@/components/landing/AmaalaSection"
import ResortsSection from "@/components/landing/ResortsSection"
import OffersSection from "@/components/landing/OffersSection"
import LocationSection from "@/components/landing/LocationSection"
import ReviewsSection from "@/components/landing/ReviewsSection"
import FAQSection from "@/components/landing/FAQSection"
import Footer from "@/components/landing/Footer"
import FullpageWrapper from "@/components/landing/FullpageWrapper"
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

export default async function Home() {
  const faqEntries = await getFaqEntries()
  const faqJsonLd = buildFaqJsonLd(faqEntries, SITE_URL)

  return (
    <>
      {/* Outside FullpageWrapper on purpose: fullPage.js treats each direct
          child of its wrapper as a section, so a script node there would be
          measured as one. */}
      <JsonLd data={faqJsonLd} />
      <FullpageWrapper>
        <div className="section">
          <HeroSection />
        </div>
        <div className="section">
          <RedSeaSection />
        </div>
        <div className="section">
          <AmaalaSection />
        </div>
        <div className="section fp-auto-height">
          <ResortsSection />
          <OffersSection />
          <LocationSection />
          <ReviewsSection />
          <FAQSection />
          <Footer />
        </div>
      </FullpageWrapper>
    </>
  )
}
