"use client"

import HeroSection from "@/components/landing/HeroSection"
import RedSeaSection from "@/components/landing/RedSeaSection"
import AmaalaSection from "@/components/landing/AmaalaSection"
import ResortsSection from "@/components/landing/ResortsSection"
import OffersSection from "@/components/landing/OffersSection"
import LocationSection from "@/components/landing/LocationSection"
import FAQSection from "@/components/landing/FAQSection"
import Footer from "@/components/landing/Footer"
import FullpageWrapper from "@/components/landing/FullpageWrapper"

export default function Home() {
  return (
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
        <FAQSection />
        <Footer />
      </div>
    </FullpageWrapper>
  )
}
