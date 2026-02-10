import MapPageClient from "@/components/map/MapPageClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "خريطة الأنشطة المائية | Duck Entertainment",
  description:
    "اكتشف مواقع الأنشطة المائية في أسوان على الخريطة التفاعلية",
}

export default function MapPage() {
  return <MapPageClient />
}
