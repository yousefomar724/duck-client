"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { getDestinations } from "@/lib/api/destinations"
import { getTrips } from "@/lib/api/trips"
import { getSuppliers } from "@/lib/api/suppliers"
import { getTourGuides } from "@/lib/api/tour-guides"
import {
  type ActivityFilter,
  destinationsToMapLocations,
  type ActivityType,
} from "@/components/map/map-data"
import { useTranslations, useLocale } from "next-intl"

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

export default function LocationSection() {
  const t = useTranslations("location")
  const tMap = useTranslations("mapPage")
  const locale = useLocale()
  const activityFilters: ActivityFilter[] = useMemo(
    () => [
      { id: "all", label: tMap("filters.all") },
      { id: "kayak", label: tMap("filters.kayak") },
      { id: "sup", label: tMap("filters.sup") },
      { id: "waterbike", label: tMap("filters.waterbike") },
    ],
    [tMap],
  )

  const [statCounts, setStatCounts] = useState<{
    destinations: number | null
    trips: number | null
    suppliers: number | null
    tourGuides: number | null
  }>({
    destinations: null,
    trips: null,
    suppliers: null,
    tourGuides: null,
  })

  const statCards = useMemo(
    () => [
      {
        value: statCounts.destinations,
        unit: t("statDestinationsUnit"),
        desc: t("statDestinationsDesc"),
      },
      {
        value: statCounts.trips,
        unit: t("statTripsUnit"),
        desc: t("statTripsDesc"),
      },
      {
        value: statCounts.suppliers,
        unit: t("statSuppliersUnit"),
        desc: t("statSuppliersDesc"),
      },
      {
        value: statCounts.tourGuides,
        unit: t("statGuidesUnit"),
        desc: t("statGuidesDesc"),
      },
    ],
    [statCounts, t],
  )

  const [locations, setLocations] = useState(
    destinationsToMapLocations([], { resolveImageUrl, locale }),
  )
  const [activeFilter, setActiveFilter] = useState<ActivityType | "all">("all")

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [destRes, tripsRes, suppliersRes, guidesRes] = await Promise.all([
        getDestinations(locale, "active"),
        getTrips(locale),
        getSuppliers(locale),
        getTourGuides(),
      ])
      if (cancelled) return
      if (destRes.data) {
        setLocations(
          destinationsToMapLocations(destRes.data, { resolveImageUrl, locale }),
        )
      }
      setStatCounts({
        destinations: destRes.error ? null : (destRes.data?.length ?? 0),
        trips: tripsRes.error ? null : (tripsRes.data?.length ?? 0),
        suppliers: suppliersRes.error ? null : (suppliersRes.data?.length ?? 0),
        tourGuides: guidesRes.error ? null : (guidesRes.data?.length ?? 0),
      })
    })()
    return () => {
      cancelled = true
    }
  }, [locale])

  const filteredLocations = useMemo(() => {
    if (activeFilter === "all") return locations
    return locations.filter((loc) => loc.activities.includes(activeFilter))
  }, [locations, activeFilter])

  return (
    <section className="bg-off-white py-20">
      <div className="max-w-[1920px] mx-auto px-4 md:px-10">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-teal-primary text-base block mb-3">
            {t("subtitle")}
          </span>
          <h2 className="text-text-dark text-4xl md:text-5xl font-bold mb-4">
            {t("title")}
          </h2>
          <p className="text-text-body mb-8 max-w-2xl mx-auto">
            {t("filterHint")}
          </p>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-12">
            {activityFilters.map((filter) => (
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
        <div className="relative w-full aspect-video max-h-[600px] mb-4 rounded-3xl shadow-sm overflow-hidden max-w-5xl mx-auto">
          <MapView
            locations={filteredLocations}
            selectedLocation={null}
            onMarkerClick={() => {}}
            mapStyle="light"
            gestureHandling="cooperative"
          />

          {/* Overlay link to full map page */}
          <Link
            href="/map"
            className="absolute bottom-4 start-4 z-10 flex items-center gap-2 bg-duck-navy/80 backdrop-blur-sm text-white text-sm px-4 py-2.5 rounded-full hover:bg-duck-navy transition-colors shadow-lg"
          >
            <MapPin className="size-4" />
            <span>{t("viewInteractiveMap")}</span>
          </Link>
        </div>

        {/* Access Info */}
        <div
          className="flex flex-wrap justify-center gap-4 mb-8"
          dir={locale === "ar" ? "rtl" : "ltr"}
        >
          {statCards.map((item, index) => (
            <div
              key={index}
              className="flex-1 min-w-[200px] max-w-[240px] bg-text-body text-white p-6 rounded-xl text-center flex flex-col items-center justify-center"
            >
              <div className="text-4xl font-bold mb-1 tabular-nums">
                {item.value === null ? "—" : item.value}
              </div>
              <div className="text-lg mb-2">{item.unit}</div>
              <div className="text-white/70 text-xs">{item.desc}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-text-muted text-xs">
          {t("locationsAvailable", { count: filteredLocations.length })}
        </p>
      </div>
    </section>
  )
}
