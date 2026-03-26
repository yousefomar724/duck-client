import MapPageClient from "@/components/map/MapPageClient"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mapPage.metadata")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function MapPage() {
  return <MapPageClient />
}
