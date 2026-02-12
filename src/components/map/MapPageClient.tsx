"use client"

import { useState, useMemo, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import type L from "leaflet"
import { Plus, Minus, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import ActivityFilters from "./ActivityFilters"
import LocationDetailPopover from "./LocationDetailPopover"
import type { MapStyle, MarkerClickEvent } from "./MapView"
import {
  LOCATIONS,
  type ActivityType,
  type WaterActivityLocation,
} from "./map-data"

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-off-white flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-duck-cyan border-t-transparent animate-spin" />
    </div>
  ),
})

export default function MapPageClient() {
  const [activeFilter, setActiveFilter] = useState<ActivityType | "all">("all")
  const [selectedLocation, setSelectedLocation] =
    useState<WaterActivityLocation | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 })
  const [mapStyle, setMapStyle] = useState<MapStyle>("light")
  const mapRef = useRef<L.Map | null>(null)

  const filteredLocations = useMemo(() => {
    if (activeFilter === "all") return LOCATIONS
    return LOCATIONS.filter((loc) => loc.activities.includes(activeFilter))
  }, [activeFilter])

  const handleMarkerClick = useCallback((event: MarkerClickEvent) => {
    setSelectedLocation(event.location)
    setAnchorPoint(event.point)
    setPopoverOpen(true)
  }, [])

  function handlePopoverChange(open: boolean) {
    setPopoverOpen(open)
    if (!open) setSelectedLocation(null)
  }

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map
  }, [])

  const isDark = mapStyle === "dark"

  return (
    <div className="relative h-screen min-h-dvh w-full overflow-hidden">
      {/* Map container — z-0 creates a stacking context so Leaflet's internal
          z-indexes (up to 1000+) don't escape and overlap navbar/popover */}
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
          aria-label={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {/* Zoom controls */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className={cn(
              "w-10 h-10 sm:w-9 sm:h-9 rounded-t-lg backdrop-blur-sm flex items-center justify-center transition-colors cursor-pointer touch-manipulation",
              isDark
                ? "bg-white/20 text-white hover:bg-white/30"
                : "bg-white text-duck-navy hover:bg-gray-100 border border-black/10",
            )}
            aria-label="تكبير"
          >
            <Plus className="size-4" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className={cn(
              "w-10 h-10 sm:w-9 sm:h-9 rounded-b-lg backdrop-blur-sm flex items-center justify-center transition-colors cursor-pointer touch-manipulation",
              isDark
                ? "bg-white/20 text-white hover:bg-white/30"
                : "bg-white text-duck-navy hover:bg-gray-100 border border-black/10 border-t-0",
            )}
            aria-label="تصغير"
          >
            <Minus className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
