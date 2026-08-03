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

/** Q&A pairs rendered by FAQSection — kept in sync with messages/*.json. */
const FAQ_COUNT = 12

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

/**
 * FAQPage structured data for the questions FAQSection already renders.
 * Google only shows FAQ rich results when the same Q&A text is visible on the
 * page, so this reads the identical translation keys the component does.
 */
async function buildFaqJsonLd() {
  const t = await getTranslations("faq")
  const entries = Array.from({ length: FAQ_COUNT }, (_, i) => i + 1)
    .map((n) => ({ question: t(`q${n}`), answer: t(`a${n}`) }))
    .filter(({ question, answer }) => question && answer)

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  }
}

export default async function Home() {
  const faqJsonLd = await buildFaqJsonLd()

  return (
    <>
      {/* Outside FullpageWrapper on purpose: fullPage.js treats each direct
          child of its wrapper as a section, so a script node there would be
          measured as one. */}
      <script
        type="application/ld+json"
        // Built from static translation files — no user input reaches this.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
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
