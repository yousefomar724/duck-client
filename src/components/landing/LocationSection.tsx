"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { getDestinations } from "@/lib/api/destinations"
import {
  ACTIVITY_FILTERS,
  destinationsToMapLocations,
  type ActivityType,
} from "@/components/map/map-data"

function resolveImageUrl(url: string): string {
  if (!url) return ""
  if (url.startsWith("http")) return url
  const normalized = url.startsWith("/") ? url : `/${url}`
  const apiUrl =
    typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL
      : "https://duckapi.alefmenu.com/api/v1"
  try {
    const parsed = new URL(apiUrl)
    if (parsed.hostname === "localhost" && parsed.port === "8080")
      return normalized
    return `${parsed.origin}${normalized}`
  } catch {
    return normalized
  }
}

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 rounded-3xl animate-pulse" />
  ),
})

const accessInfo = [
  { time: "4", unit: "مواقع", desc: "متاحة على النيل" },
  { time: "1", unit: "ساعة", desc: "طيران من القاهرة" },
  { time: "4", unit: "ساعات", desc: "بالقطار من القاهرة" },
  { time: "3", unit: "ساعات", desc: "بالسيارة من الأقصر" },
]

export default function LocationSection() {
  const [locations, setLocations] = useState(
    destinationsToMapLocations([], { resolveImageUrl }),
  )
  const [activeFilter, setActiveFilter] = useState<ActivityType | "all">("all")

  useEffect(() => {
    let cancelled = false
    getDestinations(undefined, "active").then((res) => {
      if (cancelled) return
      if (res.data) {
        setLocations(destinationsToMapLocations(res.data, { resolveImageUrl }))
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const filteredLocations = useMemo(() => {
    if (activeFilter === "all") return locations
    return locations.filter((loc) => loc.activities.includes(activeFilter))
  }, [locations, activeFilter])

  return (
    <section className="bg-off-white py-20">
      <div className="max-w-[1920px] mx-auto px-4 md:px-10">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-teal-primary text-base block mb-3">الموقع</span>
          <h2 className="text-text-dark text-4xl md:text-5xl font-bold mb-4">
            اكتشف المكان المثالي لمغامرتك المائية
          </h2>
          <p className="text-text-body mb-8 max-w-2xl mx-auto">
            اختر النشاط لرؤية المواقع المتاحة على الخريطة
          </p>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-12">
            {ACTIVITY_FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  "text-sm md:text-base font-medium transition-colors pb-2 cursor-pointer",
                  activeFilter === filter.id
                    ? "text-text-dark border-b-2 border-text-dark"
                    : "text-text-muted hover:text-text-body",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Map Container */}
        <div className="relative w-full aspect-video max-h-[600px] mb-12 rounded-3xl shadow-sm overflow-hidden max-w-5xl mx-auto">
          <MapView
            locations={filteredLocations}
            selectedLocation={null}
            onMarkerClick={() => {}}
            mapStyle="light"
          />

          {/* Overlay link to full map page */}
          <Link
            href="/map"
            className="absolute bottom-4 start-4 z-10 flex items-center gap-2 bg-duck-navy/80 backdrop-blur-sm text-white text-sm px-4 py-2.5 rounded-full hover:bg-duck-navy transition-colors shadow-lg"
          >
            <MapPin className="size-4" />
            <span>عرض الخريطة التفاعلية</span>
          </Link>
        </div>

        {/* Access Info */}
        <div className="flex flex-wrap justify-center gap-4 mb-8" dir="rtl">
          {accessInfo.map((item, index) => (
            <div
              key={index}
              className="flex-1 min-w-[200px] max-w-[240px] bg-text-body text-white p-6 rounded-xl text-center flex flex-col items-center justify-center"
            >
              <div className="text-4xl font-bold mb-1">{item.time}</div>
              <div className="text-lg mb-2">{item.unit}</div>
              <div className="text-white/70 text-xs">{item.desc}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-text-muted text-xs">
          {filteredLocations.length} مواقع متاحة للرياضات المائية على نهر النيل
          في أسوان.
        </p>
      </div>
    </section>
  )
}
