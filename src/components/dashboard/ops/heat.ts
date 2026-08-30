export type HeatLevel = 'grey' | 'green' | 'yellow' | 'orange' | 'red'

export function heatFromBookingCount(count: number): HeatLevel {
  if (count <= 0) return 'grey'
  if (count <= 3) return 'green'
  if (count <= 6) return 'yellow'
  if (count <= 10) return 'orange'
  return 'red'
}

export type DemandBand = 'available' | 'moderate' | 'high' | 'full'

export function bandFromPct(pct: number): DemandBand {
  if (pct >= 100) return 'full'
  if (pct >= 75) return 'high'
  if (pct >= 50) return 'moderate'
  return 'available'
}

export function utilisationPct(units: number, capacity: number): number {
  if (capacity <= 0) return units > 0 ? 100 : 0
  return Math.min(100, Math.round((units / capacity) * 100))
}

export const HEAT_CLASS: Record<HeatLevel, string> = {
  grey: 'bg-slate-100 text-slate-600',
  green: 'bg-emerald-100 text-emerald-800',
  yellow: 'bg-amber-100 text-amber-900',
  orange: 'bg-orange-100 text-orange-800',
  red: 'bg-red-100 text-red-800',
}

export const BAND_CLASS: Record<DemandBand, string> = {
  available: 'bg-emerald-100 text-emerald-800',
  moderate: 'bg-amber-100 text-amber-900',
  high: 'bg-orange-100 text-orange-800',
  full: 'bg-red-100 text-red-800',
}
