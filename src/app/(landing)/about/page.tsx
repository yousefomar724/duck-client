import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import AboutHero from "@/components/about/AboutHero"
import VisionMission from "@/components/about/VisionMission"
import CoreValues from "@/components/about/CoreValues"
import OurGoals from "@/components/about/OurGoals"
import WhyDuck from "@/components/about/WhyDuck"
import OurPromise from "@/components/about/OurPromise"
import Footer from "@/components/landing/Footer"

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

export default function AboutPage() {
  return (
    <>
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
