"use client"

import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import { Plus, Minus, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { getDestinations } from "@/lib/api/destinations"
import { useLocale, useTranslations } from "next-intl"
import ActivityFilters from "./ActivityFilters"
import LocationDetailPopover from "./LocationDetailPopover"
import type { MapStyle, MarkerClickEvent } from "./MapView"
import {
  destinationsToMapLocations,
  DEFAULT_ZOOM,
  FOCUSED_ZOOM,
  type ActivityType,
  type WaterActivityLocation,
} from "./map-data"

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

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-off-white flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-duck-cyan border-t-transparent animate-spin" />
    </div>
  ),
})

export default function MapPageClient() {
  const t = useTranslations("mapPage")
  const locale = useLocale()
  const [locations, setLocations] = useState<WaterActivityLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<ActivityType | "all">("all")
  const [selectedLocation, setSelectedLocation] =
    useState<WaterActivityLocation | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 })
  const [mapStyle, setMapStyle] = useState<MapStyle>("light")
  const mapRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      const res = await getDestinations(undefined, "active")
      if (cancelled) return
      if (res.error || !res.data) {
        setLocations([])
      } else {
        setLocations(
          destinationsToMapLocations(res.data, { resolveImageUrl, locale }),
        )
      }
      setIsLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [locale])

  const filteredLocations = useMemo(() => {
    if (activeFilter === "all") return locations
    return locations.filter((loc) => loc.activities.includes(activeFilter))
  }, [locations, activeFilter])

  const handleMarkerClick = useCallback((event: MarkerClickEvent) => {
    const map = mapRef.current
    if (map) {
      map.panTo({
        lat: event.location.coordinates[0],
        lng: event.location.coordinates[1],
      })
      map.setZoom(FOCUSED_ZOOM)
    }
    setSelectedLocation(event.location)
    setAnchorPoint(event.point)
    setPopoverOpen(true)
  }, [])

  function handlePopoverChange(open: boolean) {
    setPopoverOpen(open)
    if (!open) setSelectedLocation(null)
  }

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  const isDark = mapStyle === "dark"

  return (
    <div className="relative h-screen min-h-dvh w-full overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-off-white/90">
          <div className="w-10 h-10 rounded-full border-2 border-duck-cyan border-t-transparent animate-spin" />
        </div>
      )}
      {/* Map container — z-0 keeps the map under filters/nav while popover stays above */}
      <div className="absolute inset-0 z-0">
        <MapView
          locations={filteredLocations}
          selectedLocation={selectedLocation}
          onMarkerClick={handleMarkerClick}
          onMapReady={handleMapReady}
          mapStyle={mapStyle}
        />
      </div>

      {/* Filter tabs — above map but below navbar (z-50) */}
      <div className="relative z-10 pt-24 sm:pt-28 md:pt-32 px-0 sm:px-0">
        <ActivityFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          mapStyle={mapStyle}
        />
      </div>

      {/* Location detail popover */}
      <LocationDetailPopover
        location={selectedLocation}
        open={popoverOpen}
        onOpenChange={handlePopoverChange}
        anchorPoint={anchorPoint}
      />

      {/* Map controls — bottom right, safe area aware */}
      <div className="absolute bottom-4 end-3 sm:bottom-6 sm:end-4 z-10 flex flex-col gap-2 pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]">
        {/* Style toggle */}
        <button
          onClick={() => setMapStyle(isDark ? "light" : "dark")}
          className={cn(
            "w-10 h-10 sm:w-9 sm:h-9 rounded-lg backdrop-blur-sm flex items-center justify-center transition-colors cursor-pointer shadow-md touch-manipulation",
            isDark
              ? "bg-white/20 text-white hover:bg-white/30"
              : "bg-white text-duck-navy hover:bg-gray-100 border border-black/10",
          )}
          aria-label={
            isDark ? t("controls.lightMode") : t("controls.darkMode")
          }
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {/* Zoom controls */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => {
              const map = mapRef.current
              if (!map) return
              const z = map.getZoom()
              map.setZoom((z ?? DEFAULT_ZOOM) + 1)
            }}
            className={cn(
              "w-10 h-10 sm:w-9 sm:h-9 rounded-t-lg backdrop-blur-sm flex items-center justify-center transition-colors cursor-pointer touch-manipulation",
              isDark
                ? "bg-white/20 text-white hover:bg-white/30"
                : "bg-white text-duck-navy hover:bg-gray-100 border border-black/10",
            )}
            aria-label={t("controls.zoomIn")}
          >
            <Plus className="size-4" />
          </button>
          <button
            onClick={() => {
              const map = mapRef.current
              if (!map) return
              const z = map.getZoom()
              map.setZoom((z ?? DEFAULT_ZOOM) - 1)
            }}
            className={cn(
              "w-10 h-10 sm:w-9 sm:h-9 rounded-b-lg backdrop-blur-sm flex items-center justify-center transition-colors cursor-pointer touch-manipulation",
              isDark
                ? "bg-white/20 text-white hover:bg-white/30"
                : "bg-white text-duck-navy hover:bg-gray-100 border border-black/10 border-t-0",
            )}
            aria-label={t("controls.zoomOut")}
          >
            <Minus className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
