import type { Destination, Supplier, TourGuide, Trip } from "@/lib/types"

type GoId = { id?: number; ID?: number }

function pickId(obj: GoId | null | undefined): number | undefined {
  if (obj == null) return undefined
  return obj.id ?? obj.ID
}

/** Go JSON often uses `ID` (gorm.Model); frontend expects `id`. */
export function normalizeDestination(raw: unknown): Destination {
  if (raw == null || typeof raw !== "object") {
    return raw as Destination
  }
  const d = raw as Record<string, unknown> & GoId
  const id = pickId(d)
  return {
    ...(d as object),
    id: id ?? 0,
  } as Destination
}

function normalizeSupplier(raw: unknown): Supplier | undefined {
  if (raw == null || typeof raw !== "object") return undefined
  const s = raw as Record<string, unknown> & GoId
  const id = pickId(s)
  return { ...(s as object), id: id ?? 0 } as Supplier
}

function normalizeTourGuideNested(raw: unknown): TourGuide | undefined {
  if (raw == null || typeof raw !== "object") return undefined
  const g = raw as Record<string, unknown> & GoId
  const id = pickId(g)
  return { ...(g as object), id: id ?? 0 } as TourGuide
}

export function normalizeTrip(raw: unknown): Trip {
  if (raw == null || typeof raw !== "object") {
    return raw as Trip
  }
  const t = raw as Record<string, unknown> & GoId
  const id = pickId(t) ?? 0

  const out: Record<string, unknown> = { ...t, id }

  if (Array.isArray(t.destinations)) {
    out.destinations = t.destinations.map((d) => normalizeDestination(d))
  }

  if (t.supplier != null) {
    out.supplier = normalizeSupplier(t.supplier)
  }

  if (t.tour_guide != null) {
    out.tour_guide = normalizeTourGuideNested(t.tour_guide)
  }

  const tgId = t.tour_guide_id as number | null | undefined
  const normalizedGuide = out.tour_guide as TourGuide | undefined
  if (
    (tgId == null || tgId === 0) &&
    normalizedGuide?.id
  ) {
    out.tour_guide_id = normalizedGuide.id
  }

  return out as unknown as Trip
}

export function normalizeTrips(raw: unknown): Trip[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => normalizeTrip(item))
}

export function normalizeDestinations(raw: unknown): Destination[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => normalizeDestination(item))
}
