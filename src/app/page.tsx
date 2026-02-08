import Navbar from "@/src/components/landing/Navbar"
import HeroSection from "@/src/components/landing/HeroSection"
import RedSeaSection from "@/src/components/landing/RedSeaSection"
import AmaalaSection from "@/src/components/landing/AmaalaSection"
import ResortsSection from "@/src/components/landing/ResortsSection"
import OffersSection from "@/src/components/landing/OffersSection"
import ExperiencesSection from "@/src/components/landing/ExperiencesSection"
import LocationSection from "@/src/components/landing/LocationSection"
import WeatherSection from "@/src/components/landing/WeatherSection"
import Footer from "@/src/components/landing/Footer"
import ScrollManager from "@/src/components/ScrollManager"

export default function Home() {
  return (
    <>
      <ScrollManager />
      <Navbar />

      <div className="fullpage-container w-full overflow-x-hidden">
        <HeroSection />
        <RedSeaSection />
        <AmaalaSection />

        {/* Normal scroll sections */}
        <div className="normal-scroll relative z-10 bg-white">
          <ResortsSection />
          <OffersSection />
          <ExperiencesSection />
          <LocationSection />
          <WeatherSection />
          <Footer />
        </div>
      </div>
    </>
  )
}
