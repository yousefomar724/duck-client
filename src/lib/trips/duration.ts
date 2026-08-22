export type LocalizedDuration = {
  ar?: string
  en?: string
}

const ARABIC_INDIC = /[\u0660-\u0669]/g
const EASTERN_INDIC = /[\u06F0-\u06F9]/g

function normalizeDigits(text: string): string {
  return text
    .replace(ARABIC_INDIC, (ch) => String(ch.charCodeAt(0) - 0x0660))
    .replace(EASTERN_INDIC, (ch) => String(ch.charCodeAt(0) - 0x06f0))
}

/**
 * Largest number found in a free-text duration (`"2 to 3 hours"` → `3`).
 * Understands Arabic-Indic digits. Returns `null` when nothing parses.
 */
export function parseDurationHours(text: string): number | null {
  if (!text.trim()) return null
  const matches = normalizeDigits(text).match(/\d+(?:\.\d+)?/g)
  if (!matches) return null
  let max = -Infinity
  for (const raw of matches) {
    const n = Number(raw)
    if (Number.isFinite(n) && n > max) max = n
  }
  if (!Number.isFinite(max) || max <= 0) return null
  return Math.max(1, Math.ceil(max))
}

export function parseDurationHoursFromLocalized(
  durationText?: LocalizedDuration | null,
): number | null {
  if (!durationText) return null
  const fromEn = parseDurationHours(durationText.en ?? "")
  const fromAr = parseDurationHours(durationText.ar ?? "")
  if (fromEn == null && fromAr == null) return null
  return Math.max(fromEn ?? 0, fromAr ?? 0)
}

/**
 * Localized display string when `duration_text` is set; otherwise `null`
 * so callers can fall back to the numeric duration.
 */
export function tripDurationText(
  trip: { duration_text?: LocalizedDuration | string | null },
  locale: string,
): string | null {
  const raw = trip.duration_text
  if (raw == null) return null
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    return trimmed || null
  }
  const preferAr = locale.toLowerCase().startsWith("ar")
  const primary = (preferAr ? raw.ar : raw.en)?.trim()
  if (primary) return primary
  const fallback = (raw.en || raw.ar)?.trim()
  return fallback || null
}
