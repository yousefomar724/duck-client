"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet"
import { Browser, divIcon, latLngBounds, type Map as LeafletMap } from "leaflet"
import "leaflet/dist/leaflet.css"
import type { WaterActivityLocation } from "./map-data"
import {
  ASWAN_CENTER,
  DEFAULT_ZOOM,
  FOCUSED_ZOOM,
  MAP_MARKER_URL,
} from "./map-data"

export type MapStyle = "light" | "dark"
export type MapInstance = LeafletMap

const MIN_ZOOM = 3
const MAX_ZOOM = 19

/**
 * CARTO basemaps (OpenStreetMap data) — no API key and no billing account.
 * Attribution to both OSM and CARTO is required by their terms, so the
 * attribution control stays enabled.
 */
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

/**
 * CARTO serves 512px "@2x" tiles at the same tile count, so requesting them on
 * HiDPI screens sharpens the map without quadrupling the number of requests
 * (which is what Leaflet's own `detectRetina` would do).
 */
function tileUrl(mapStyle: MapStyle): string {
  const theme = mapStyle === "dark" ? "dark_all" : "light_all"
  const scale =
    typeof window !== "undefined" && window.devicePixelRatio > 1 ? "@2x" : ""
  return `https://{s}.basemaps.cartocdn.com/${theme}/{z}/{x}/{y}${scale}.png`
}

function createMarkerIcon({
  size,
  showPulse,
  dimmed,
  mapStyle,
}: {
  size: number
  showPulse: boolean
  dimmed: boolean
  mapStyle: MapStyle
}) {
  const dropShadow =
    mapStyle === "dark"
      ? "drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 1px 3px rgba(0,0,0,0.5))"
      : "none"
  const pulse = showPulse
    ? `<span class="pointer-events-none absolute left-1/2 top-1/2 z-0 inline-flex size-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-duck-cyan/40 opacity-75 animate-ping" aria-hidden="true"></span>`
    : ""

  return divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    html: `<div class="relative cursor-pointer" style="width:${size}px;height:${size}px">${pulse}<img src="${MAP_MARKER_URL}" alt="" width="${size}" height="${size}" class="relative z-10 h-full w-full object-contain" style="filter:${dropShadow};opacity:${dimmed ? 0.7 : 1}" /></div>`,
  })
}

function FitBounds({ locations }: { locations: WaterActivityLocation[] }) {
  const map = useMap()
  const prevLengthRef = useRef(locations.length)
  const [padding, setPadding] = useState({ v: 60, h: 60 })

  useEffect(() => {
    const updatePadding = () => {
      setPadding(
        typeof window !== "undefined" && window.innerWidth < 640
          ? { v: 24, h: 24 }
          : { v: 60, h: 60 },
      )
    }
    updatePadding()
    window.addEventListener("resize", updatePadding)
    return () => window.removeEventListener("resize", updatePadding)
  }, [])

  useEffect(() => {
    if (locations.length === 0) {
      map.panTo({ lat: ASWAN_CENTER[0], lng: ASWAN_CENTER[1] })
      map.setZoom(DEFAULT_ZOOM)
      prevLengthRef.current = 0
      return
    }

    if (locations.length !== prevLengthRef.current) {
      const bounds = latLngBounds(locations.map((loc) => loc.coordinates))
      map.fitBounds(bounds, {
        padding: [padding.h, padding.v],
        // A single result yields a zero-size bounds, which would otherwise
        // snap all the way to MAX_ZOOM.
        maxZoom: FOCUSED_ZOOM,
      })
      prevLengthRef.current = locations.length
    }
  }, [locations, map, padding])

  return null
}

function MapReadyBridge({
  onMapReady,
}: {
  onMapReady: (map: MapInstance) => void
}) {
  const map = useMap()
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    onMapReady(map)
    calledRef.current = true
  }, [map, onMapReady])

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
  const map = useMap()
  const isComingSoon = location.status === "coming_soon"
  const size = isSelected ? 44 : 32

  const icon = useMemo(
    () =>
      createMarkerIcon({
        size,
        showPulse: isComingSoon && !isSelected,
        dimmed: isComingSoon && !isSelected,
        mapStyle,
      }),
    [size, isComingSoon, isSelected, mapStyle],
  )

  return (
    <Marker
      position={location.coordinates}
      icon={icon}
      alt={location.name}
      zIndexOffset={isSelected ? 1000 : 0}
      eventHandlers={{
        click: () => {
          const point = map.latLngToContainerPoint(location.coordinates)
          onMarkerClick({
            location,
            point: { x: point.x, y: point.y },
          })
        },
      }}
    />
  )
}

const defaultCenter: [number, number] = ASWAN_CENTER

export default function MapView({
  locations,
  selectedLocation,
  onMarkerClick,
  onMapReady,
  mapStyle,
  gestureHandling = "greedy",
}: MapViewProps) {
  const interactive = gestureHandling !== "none"
  const isCooperative = gestureHandling === "cooperative"

  return (
    <MapContainer
      center={defaultCenter}
      zoom={DEFAULT_ZOOM}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      className={
        mapStyle === "dark"
          ? "h-full w-full bg-duck-navy-deep!"
          : "h-full w-full bg-off-white!"
      }
      zoomControl={false}
      scrollWheelZoom={interactive && !isCooperative}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      keyboard={interactive}
      // An embedded map must not swallow one-finger page scrolling on touch.
      dragging={interactive && !(isCooperative && Browser.mobile)}
    >
      <TileLayer
        key={mapStyle}
        url={tileUrl(mapStyle)}
        attribution={TILE_ATTRIBUTION}
        subdomains="abcd"
        maxZoom={MAX_ZOOM}
      />
      <FitBounds locations={locations} />
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
    </MapContainer>
  )
}
