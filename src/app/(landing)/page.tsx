import Navbar from "@/components/landing/Navbar"
import HeroSection from "@/components/landing/HeroSection"
import RedSeaSection from "@/components/landing/RedSeaSection"
import AmaalaSection from "@/components/landing/AmaalaSection"
import ResortsSection from "@/components/landing/ResortsSection"
import OffersSection from "@/components/landing/OffersSection"
import ExperiencesSection from "@/components/landing/ExperiencesSection"
import LocationSection from "@/components/landing/LocationSection"
import WeatherSection from "@/components/landing/WeatherSection"
import Footer from "@/components/landing/Footer"
import ScrollManager from "@/components/ScrollManager"

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
