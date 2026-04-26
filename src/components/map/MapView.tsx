"use client"

import {
  useEffect,
  useRef,
  useCallback,
  useState,
  type MutableRefObject,
} from "react"
import {
  APIProvider,
  Map,
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  ColorScheme,
  useMap,
} from "@vis.gl/react-google-maps"
import type { WaterActivityLocation } from "./map-data"
import { ASWAN_CENTER, DEFAULT_ZOOM } from "./map-data"

export type MapStyle = "light" | "dark"

const LOGO_PIN_URL = "/duck.png"

function ProjectionUpdater({
  projectionRef,
}: {
  projectionRef: MutableRefObject<google.maps.MapCanvasProjection | null>
}) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    const overlay = new google.maps.OverlayView()
    overlay.onAdd = () => {}
    overlay.draw = () => {
      projectionRef.current = overlay.getProjection()
    }
    overlay.onRemove = () => {
      projectionRef.current = null
    }
    overlay.setMap(map)
    return () => {
      overlay.setMap(null)
      projectionRef.current = null
    }
  }, [map, projectionRef])

  return null
}

function latLngToAnchorPoint(
  projection: google.maps.MapCanvasProjection | null,
  lat: number,
  lng: number,
): { x: number; y: number } {
  if (!projection) return { x: 0, y: 0 }
  const pt = projection.fromLatLngToContainerPixel({ lat, lng })
  if (!pt) return { x: 0, y: 0 }
  return { x: pt.x, y: pt.y }
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
    if (!map) return

    if (locations.length === 0) {
      map.panTo({ lat: ASWAN_CENTER[0], lng: ASWAN_CENTER[1] })
      map.setZoom(DEFAULT_ZOOM)
      prevLengthRef.current = 0
      return
    }

    if (locations.length !== prevLengthRef.current) {
      const bounds = new google.maps.LatLngBounds()
      for (const loc of locations) {
        bounds.extend({
          lat: loc.coordinates[0],
          lng: loc.coordinates[1],
        })
      }
      map.fitBounds(bounds, {
        top: padding.v,
        bottom: padding.v,
        left: padding.h,
        right: padding.h,
      })
      prevLengthRef.current = locations.length
    }
  }, [locations, map, padding])

  return null
}

function MapReadyBridge({
  onMapReady,
}: {
  onMapReady: (map: google.maps.Map) => void
}) {
  const map = useMap()
  const calledRef = useRef(false)

  useEffect(() => {
    if (!map || calledRef.current) return
    onMapReady(map)
    calledRef.current = true
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
  onMapReady?: (map: google.maps.Map) => void
  mapStyle: MapStyle
}

function MarkerWithClick({
  location,
  isSelected,
  mapStyle,
  projectionRef,
  onMarkerClick,
}: {
  location: WaterActivityLocation
  isSelected: boolean
  mapStyle: MapStyle
  projectionRef: MutableRefObject<google.maps.MapCanvasProjection | null>
  onMarkerClick: (event: MarkerClickEvent) => void
}) {
  const size = isSelected ? 44 : 32
  const isComingSoon = location.status === "coming_soon"
  const dropShadow =
    mapStyle === "dark"
      ? "drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 1px 3px rgba(0,0,0,0.5))"
      : "none"
  const opacity = isComingSoon && !isSelected ? 0.7 : 1

  const handleClick = () => {
    const point = latLngToAnchorPoint(
      projectionRef.current,
      location.coordinates[0],
      location.coordinates[1],
    )
    onMarkerClick({ location, point })
  }

  return (
    <AdvancedMarker
      position={{
        lat: location.coordinates[0],
        lng: location.coordinates[1],
      }}
      anchorPoint={AdvancedMarkerAnchorPoint.BOTTOM}
      onClick={handleClick}
    >
      <div
        className="relative cursor-pointer"
        style={{ width: size, height: size }}
      >
        {isComingSoon && !isSelected ? (
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 inline-flex size-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-duck-cyan/40 opacity-75 animate-ping"
            aria-hidden
          />
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_PIN_URL}
          alt=""
          width={size}
          height={size}
          className="relative z-10 h-full w-full object-contain transition-transform"
          style={{ filter: dropShadow, opacity }}
        />
      </div>
    </AdvancedMarker>
  )
}

const defaultCenter = { lat: ASWAN_CENTER[0], lng: ASWAN_CENTER[1] }

export default function MapView({
  locations,
  selectedLocation,
  onMarkerClick,
  onMapReady,
  mapStyle,
}: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? ""

  const projectionRef = useRef<google.maps.MapCanvasProjection | null>(null)

  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      onMapReady?.(map)
    },
    [onMapReady],
  )

  if (!apiKey || !mapId) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-off-white p-4 text-center text-sm text-duck-navy">
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID to
        load the map.
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={DEFAULT_ZOOM}
        mapId={mapId}
        className="h-full w-full"
        colorScheme={
          mapStyle === "dark" ? ColorScheme.DARK : ColorScheme.LIGHT
        }
        disableDefaultUI
        gestureHandling="greedy"
      >
        <ProjectionUpdater projectionRef={projectionRef} />
        <FitBounds locations={locations} />
        <MapReadyBridge onMapReady={handleMapReady} />
        {locations.map((location) => (
          <MarkerWithClick
            key={`${location.id}-${mapStyle}`}
            location={location}
            isSelected={selectedLocation?.id === location.id}
            mapStyle={mapStyle}
            projectionRef={projectionRef}
            onMarkerClick={onMarkerClick}
          />
        ))}
      </Map>
    </APIProvider>
  )
}
