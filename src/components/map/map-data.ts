import type { Destination } from "@/lib/types"

export type ActivityType = "kayak" | "sup" | "waterbike"

export type DifficultyLevel = "easy" | "medium" | "hard"

export interface WaterActivityLocation {
  id: string
  name: string
  coordinates: [number, number]
  activities: ActivityType[]
  image: string
  /** Multiple images for carousel; falls back to `image` if absent */
  images?: string[]
  status: "open" | "coming_soon"
  description: string
  duration?: string
  price?: string
  operatingHours?: string
  difficulty?: DifficultyLevel
  highlights?: string[]
}

export interface ActivityFilter {
  id: ActivityType | "all"
  label: string
}

export const ASWAN_CENTER: [number, number] = [24.0889, 32.8998]
export const DEFAULT_ZOOM = 13
/** Zoom level when a pin is selected (zoom in to focus on the location) */
export const FOCUSED_ZOOM = 15

/**
 * Transforms an API Destination into a WaterActivityLocation for the map.
 * Only destinations with valid lat/lng are suitable for the map; filter before calling.
 */
export function destinationToMapLocation(
  destination: Destination,
  options?: {
    resolveImageUrl?: (url: string) => string
    locale?: string
  },
): WaterActivityLocation {
  const resolve = options?.resolveImageUrl ?? ((u: string) => u)
  const locale = options?.locale === "en" ? "en" : "ar"
  const name =
    typeof destination.name === "string"
      ? destination.name
      : locale === "en"
        ? destination.name?.en ?? destination.name?.ar ?? ""
        : destination.name?.ar ?? destination.name?.en ?? ""
  const description =
    typeof destination.description === "string"
      ? destination.description
      : locale === "en"
        ? destination.description?.en ?? destination.description?.ar ?? ""
        : destination.description?.ar ?? destination.description?.en ?? ""
  const image =
    destination.images?.[0] ?? destination.image ?? ""
  const images = destination.images?.length
    ? destination.images
    : destination.image
      ? [destination.image]
      : undefined
  const status: "open" | "coming_soon" =
    destination.public_status === "coming-soon" ? "coming_soon" : "open"

  return {
    id: String(destination.id),
    name,
    coordinates: [destination.lat ?? 0, destination.lng ?? 0],
    activities: (destination.activities ?? []) as ActivityType[],
    image: resolve(image),
    images: images?.map(resolve),
    status,
    description,
    operatingHours: destination.operating_hours,
  }
}

/**
 * Converts a list of API destinations into map locations. Skips destinations without valid lat/lng.
 */
export function destinationsToMapLocations(
  destinations: Destination[],
  options?: {
    resolveImageUrl?: (url: string) => string
    locale?: string
  },
): WaterActivityLocation[] {
  return destinations
    .filter((d) => d.lat != null && d.lng != null)
    .map((d) => destinationToMapLocation(d, options))
}
