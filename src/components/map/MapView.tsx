"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet"
import type { WaterActivityLocation } from "./map-data"
import { ASWAN_CENTER, DEFAULT_ZOOM } from "./map-data"

export type MapStyle = "light" | "dark"

const TILE_URLS: Record<MapStyle, string> = {
  light:
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
}

const LOGO_PIN_URL = "/duck.png"

function createMarkerIcon(
  isSelected: boolean,
  isComingSoon: boolean,
  mapStyle: MapStyle,
) {
  const size = isSelected ? 44 : 32
  const dropShadow =
    mapStyle === "dark"
      ? "drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 1px 3px rgba(0,0,0,0.5))"
      : "none"
  const opacity = isComingSoon && !isSelected ? "0.7" : "1"
  const pulseAnimation =
    isComingSoon && !isSelected
      ? `<style>.pulse-ring{animation:pulse-ring 2s ease-out infinite}@keyframes pulse-ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.5);opacity:0}}</style><div class="pulse-ring" style="position:absolute;left:50%;top:50%;width:${size}px;height:${size}px;margin-left:-${size / 2}px;margin-top:-${size / 2}px;border-radius:50%;background:#2bbbc5;opacity:0.4"></div>`
      : ""

  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;cursor:pointer;">
        ${pulseAnimation}
        <img
          src="${LOGO_PIN_URL}"
          alt=""
          style="
            width:100%;height:100%;object-fit:contain;position:relative;z-index:1;
            filter:${dropShadow};
            opacity:${opacity};
            transition:transform 0.2s;
          "
        />
      </div>
    `,
  })
}

function FitBounds({ locations }: { locations: WaterActivityLocation[] }) {
  const map = useMap()
  const prevLengthRef = useRef(locations.length)
  const [padding, setPadding] = useState([60, 60] as [number, number])

  useEffect(() => {
    const updatePadding = () => {
      setPadding(
        typeof window !== "undefined" && window.innerWidth < 640
          ? [24, 24]
          : [60, 60],
      )
    }
    updatePadding()
    window.addEventListener("resize", updatePadding)
    return () => window.removeEventListener("resize", updatePadding)
  }, [])

  useEffect(() => {
    if (locations.length === 0) {
      map.flyTo(ASWAN_CENTER, DEFAULT_ZOOM, { duration: 0.8 })
      prevLengthRef.current = 0
      return
    }

    if (locations.length !== prevLengthRef.current) {
      const bounds = L.latLngBounds(locations.map((loc) => loc.coordinates))
      map.flyToBounds(bounds, { padding, duration: 0.8 })
      prevLengthRef.current = locations.length
    }
  }, [locations, map, padding])

  return null
}

function MapReadyBridge({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap()
  const calledRef = useRef(false)

  useEffect(() => {
    if (!calledRef.current) {
      onMapReady(map)
      calledRef.current = true
    }
  }, [map, onMapReady])

  return null
}

export interface MarkerClickEvent {
  location: WaterActivityLocation
  point: { x: number; y: number }
}

interface MapViewProps {
  locations: WaterActivityLocation[]
  selectedLocation: WaterActivityLocation | null
  onMarkerClick: (event: MarkerClickEvent) => void
  onMapReady?: (map: L.Map) => void
  mapStyle: MapStyle
}

function MarkerWithClick({
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

  return (
    <Marker
      position={location.coordinates}
      icon={createMarkerIcon(
        isSelected,
        location.status === "coming_soon",
        mapStyle,
      )}
      eventHandlers={{
        click: () => {
          const point = map.latLngToContainerPoint(location.coordinates)
          onMarkerClick({ location, point: { x: point.x, y: point.y } })
        },
      }}
    />
  )
}

export default function MapView({
  locations,
  selectedLocation,
  onMarkerClick,
  onMapReady,
  mapStyle,
}: MapViewProps) {
  const handleMapReady = useCallback(
    (map: L.Map) => {
      onMapReady?.(map)
    },
    [onMapReady],
  )

  return (
    <MapContainer
      center={ASWAN_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        key={mapStyle}
        url={TILE_URLS[mapStyle]}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
      />
      <FitBounds locations={locations} />
      <MapReadyBridge onMapReady={handleMapReady} />
      {locations.map((location) => (
        <MarkerWithClick
          key={`${location.id}-${mapStyle}`}
          location={location}
          isSelected={selectedLocation?.id === location.id}
          mapStyle={mapStyle}
          onMarkerClick={onMarkerClick}
        />
      ))}
    </MapContainer>
  )
}
