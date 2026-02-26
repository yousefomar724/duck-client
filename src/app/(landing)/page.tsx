import HeroSection from "@/components/landing/HeroSection"
import RedSeaSection from "@/components/landing/RedSeaSection"
import AmaalaSection from "@/components/landing/AmaalaSection"
import ResortsSection from "@/components/landing/ResortsSection"
import OffersSection from "@/components/landing/OffersSection"
import ExperiencesSection from "@/components/landing/ExperiencesSection"
import LocationSection from "@/components/landing/LocationSection"
import WeatherSection from "@/components/landing/WeatherSection"
import FAQSection from "@/components/landing/FAQSection"
import Footer from "@/components/landing/Footer"

export default function Home() {
  return (
    <>
      <div className="fixed top-0 left-0 w-full h-screen z-0">
        <div
          id="intro-section-0"
          className="absolute inset-0 w-full h-full opacity-100"
        >
          <HeroSection />
        </div>
        <div
          id="intro-section-1"
          className="absolute inset-0 w-full h-full opacity-0"
        >
          <RedSeaSection />
        </div>
        <div
          id="intro-section-2"
          className="absolute inset-0 w-full h-full opacity-0"
        >
          <AmaalaSection />
        </div>
      </div>

      {/* Spacer to allow scrolling to 'normal' content */}
      {/* 
        The first 100vh is 'virtual' scroll space for the intro (handled by ScrollManager).
        Wait, ScrollManager intercepts wheel. It doesn't need physical space for 0-2.
        But it DOES need space to scroll TO when we go to normal content.
        So we need a spacer of 100vh to push normal content down?
        Yes, Normal Content should start at top: 100vh.
      */}
      <div className="relative w-full z-10" style={{ marginTop: "100vh" }}>
        <div className="bg-white">
          <ResortsSection />
          <OffersSection />
          <ExperiencesSection />
          <LocationSection />
          {/* <WeatherSection /> */}
          <FAQSection />
          <Footer />
        </div>
      </div>
    </>
  )
}
