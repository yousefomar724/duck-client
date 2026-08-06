"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import * as maplibregl from "maplibre-gl"
import { LngLatBounds, type Map as MapLibreMap } from "maplibre-gl"
import { useLocale } from "next-intl"
import { cn } from "@/lib/utils"
import {
  Map,
  MapMarker,
  MarkerContent,
  useMap,
  type MapRef,
} from "@/components/ui/map"
import type { WaterActivityLocation } from "./map-data"
import {
  ASWAN_CENTER,
  DEFAULT_ZOOM,
  FOCUSED_ZOOM,
  MAP_MARKER_URL,
} from "./map-data"

export type MapStyle = "light" | "dark"
export type MapInstance = MapRef

const MIN_ZOOM = 3
const MAX_ZOOM = 19

/**
 * MapLibre renders Arabic labels client-side (unlike the old Leaflet raster
 * tiles, which had labels baked into the PNGs) and shapes them incorrectly
 * without this plugin. Self-hosted from `public/` — the app is a PWA with a
 * service worker, so a CDN script is an avoidable external dependency.
 */
const RTL_PLUGIN_URL = "/mapbox-gl-rtl-text.js"

/**
 * MapLibre decodes vector tiles in a Web Worker whose URL it derives from
 * `import.meta.url`, assuming `maplibre-gl-worker.mjs` sits next to the main
 * bundle. Turbopack emits the bundle into `_next/static/chunks/` without that
 * sibling, so the worker 404s (the dev server answers with an HTML page, which
 * fails module MIME checking), every tile request hangs in `loading` forever,
 * and the map paints as an empty background with no error on the map itself.
 * `scripts/copy-maplibre-worker.mjs` copies the worker into `public/maplibre/`
 * on postinstall so this path is always present and version-matched.
 */
const WORKER_URL = "/maplibre/maplibre-gl-worker.mjs"

if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl(WORKER_URL)

  if (maplibregl.getRTLTextPluginStatus() === "unavailable") {
    void maplibregl.setRTLTextPlugin(RTL_PLUGIN_URL, true).catch(() => {
      // Arabic labels fall back to default shaping; non-fatal.
    })
  }
}

function toLngLat([lat, lng]: [number, number]): [number, number] {
  return [lng, lat]
}

/** Tints the CARTO basemap toward the DUCK palette. Matched by `source-layer`
 *  (not layer id) so it survives both the light and dark CARTO styles, and
 *  reapplied on every `styledata` event since a theme swap reloads the whole
 *  style and drops paint overrides. Each write is independently guarded so an
 *  unexpected CARTO layer shape degrades to the stock basemap instead of
 *  throwing. */
function applyBrandTint(map: MapLibreMap, mapStyle: MapStyle, locale: string) {
  const layers = map.getStyle()?.layers
  if (!layers) return

  const isDark = mapStyle === "dark"
  const waterColor = isDark ? "#0a3547" : "#bfe6f0"
  const landColor = isDark ? "#0c0e1a" : "#f5f5f0"

  for (const layer of layers) {
    const sourceLayer = (layer as { "source-layer"?: string })["source-layer"]

    try {
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", landColor)
      } else if (layer.type === "fill" && sourceLayer === "water") {
        map.setPaintProperty(layer.id, "fill-color", waterColor)
      } else if (
        layer.type === "fill" &&
        (sourceLayer === "landcover" || sourceLayer === "landuse")
      ) {
        map.setPaintProperty(layer.id, "fill-color", landColor)
      } else if (
        layer.type === "line" &&
        (sourceLayer === "transportation" || sourceLayer === "boundary")
      ) {
        map.setPaintProperty(layer.id, "line-opacity", 0.45)
      }
    } catch {
      // This CARTO style version doesn't support the paint property on this
      // layer type — leave it at its stock value.
    }

    if (layer.type === "symbol" && sourceLayer === "place" && locale === "en") {
      try {
        map.setLayoutProperty(layer.id, "text-field", [
          "coalesce",
          ["get", "name:en"],
          ["get", "name"],
        ])
      } catch {
        // Fall back to the style's default (Arabic) place names.
      }
    }
  }
}

function BrandTint({
  mapStyle,
  locale,
}: {
  mapStyle: MapStyle
  locale: string
}) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map) return

    const apply = () => applyBrandTint(map, mapStyle, locale)
    if (isLoaded) apply()

    map.on("styledata", apply)
    return () => {
      map.off("styledata", apply)
    }
  }, [map, isLoaded, mapStyle, locale])

  return null
}

function FitBounds({ locations }: { locations: WaterActivityLocation[] }) {
  const { map, isLoaded } = useMap()
  const prevLengthRef = useRef(locations.length)
  const [padding, setPadding] = useState(60)

  useEffect(() => {
    const updatePadding = () => {
      setPadding(
        typeof window !== "undefined" && window.innerWidth < 640 ? 24 : 60,
      )
    }
    updatePadding()
    window.addEventListener("resize", updatePadding)
    return () => window.removeEventListener("resize", updatePadding)
  }, [])

  useEffect(() => {
    if (!map || !isLoaded) return

    if (locations.length === 0) {
      map.panTo(toLngLat(ASWAN_CENTER))
      map.setZoom(DEFAULT_ZOOM)
      prevLengthRef.current = 0
      return
    }

    if (locations.length !== prevLengthRef.current) {
      const first = toLngLat(locations[0].coordinates)
      const bounds = locations.reduce(
        (b, loc) => b.extend(toLngLat(loc.coordinates)),
        new LngLatBounds(first, first),
      )
      // A single result yields a zero-size bounds, which would otherwise
      // snap all the way to MAX_ZOOM.
      map.fitBounds(bounds, { padding, maxZoom: FOCUSED_ZOOM })
      prevLengthRef.current = locations.length
    }
  }, [locations, map, isLoaded, padding])

  return null
}

function MapReadyBridge({
  onMapReady,
}: {
  onMapReady: (map: MapInstance) => void
}) {
  const { map } = useMap()
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current || !map) return
    onMapReady(map)
    calledRef.current = true
  }, [map, onMapReady])

  return null
}

/**
 * A map mounted while its tab/pane is hidden can leave its render loop idle,
 * and becoming visible again doesn't itself schedule a repaint.
 */
function VisibilityRepaint() {
  const { map } = useMap()

  useEffect(() => {
    if (!map) return
    const handleVisibilityChange = () => {
      if (document.hidden) return
      map.resize()
      map.triggerRepaint()
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [map])

  return null
}

export interface MarkerClickEvent {
  location: WaterActivityLocation
  point: { x: number; y: number }
}

type GestureHandling = "auto" | "cooperative" | "greedy" | "none"

interface MapViewProps {
  locations: WaterActivityLocation[]
  selectedLocation: WaterActivityLocation | null
  onMarkerClick: (event: MarkerClickEvent) => void
  onMapReady?: (map: MapInstance) => void
  mapStyle: MapStyle
  /** "cooperative" lets the page scroll over the map (wheel does not zoom). Default "greedy" for full-page maps. */
  gestureHandling?: GestureHandling
}

function LocationMarker({
  location,
  isSelected,
  mapStyle,
  onMarkerClick,
}: {
  location: WaterActivityLocation
  isSelected: boolean
  mapStyle: MapStyle
  onMarkerClick: (event: MarkerClickEvent) => void
}) {
  const { map } = useMap()
  const isComingSoon = location.status === "coming_soon"
  const size = isSelected ? 44 : 32
  const dimmed = isComingSoon && !isSelected
  const [lng, lat] = toLngLat(location.coordinates)

  const dropShadow =
    mapStyle === "dark"
      ? "drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 1px 3px rgba(0,0,0,0.5))"
      : "none"

  const handleClick = useCallback(() => {
    if (!map) return
    const point = map.project([lng, lat])
    onMarkerClick({ location, point: { x: point.x, y: point.y } })
  }, [map, lng, lat, location, onMarkerClick])

  return (
    <MapMarker
      longitude={lng}
      latitude={lat}
      anchor="bottom"
      onClick={handleClick}
    >
      <MarkerContent>
        <div className="relative" style={{ width: size, height: size }}>
          {dimmed && (
            <span
              className="pointer-events-none absolute left-1/2 top-1/2 z-0 inline-flex size-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-duck-cyan/40 opacity-75 animate-ping"
              aria-hidden="true"
            />
          )}
          <img
            src={MAP_MARKER_URL}
            alt=""
            width={size}
            height={size}
            className="relative z-10 h-full w-full object-contain"
            style={{ filter: dropShadow, opacity: dimmed ? 0.7 : 1 }}
          />
        </div>
      </MarkerContent>
    </MapMarker>
  )
}

export default function MapView({
  locations,
  selectedLocation,
  onMarkerClick,
  onMapReady,
  mapStyle,
  gestureHandling = "greedy",
}: MapViewProps) {
  const locale = useLocale()
  const interactive = gestureHandling !== "none"
  const isCooperative = gestureHandling === "cooperative"
  const [isCoarsePointer, setIsCoarsePointer] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches,
  )

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)")
    const update = () => setIsCoarsePointer(mq.matches)
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  return (
    // MapLibre adds its own classes (e.g. `maplibregl-map`) directly to the
    // container div `<Map>` renders. Passing a `mapStyle`-dependent className
    // to `<Map>` itself would make React overwrite those on every theme
    // toggle, so the background color lives on this wrapper instead.
    <div
      className={cn(
        "h-full w-full",
        mapStyle === "dark" ? "bg-duck-navy-deep" : "bg-off-white",
      )}
    >
      <Map
        center={toLngLat(ASWAN_CENTER)}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        theme={mapStyle}
        interactive={interactive}
        scrollZoom={interactive && !isCooperative}
        // An embedded map must not swallow one-finger page scrolling on touch.
        dragPan={interactive && !(isCooperative && isCoarsePointer)}
        doubleClickZoom={interactive}
        touchZoomRotate={interactive}
        dragRotate={false}
        pitchWithRotate={false}
        keyboard={interactive}
      >
        <FitBounds locations={locations} />
        <BrandTint mapStyle={mapStyle} locale={locale} />
        <VisibilityRepaint />
        {onMapReady ? <MapReadyBridge onMapReady={onMapReady} /> : null}
        {locations.map((location) => (
          <LocationMarker
            key={location.id}
            location={location}
            isSelected={selectedLocation?.id === location.id}
            mapStyle={mapStyle}
            onMarkerClick={onMarkerClick}
          />
        ))}
      </Map>
    </div>
  )
}
