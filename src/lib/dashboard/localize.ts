import { DASHBOARD_LANG } from "./strings"

type LocalizedValue = string | { ar?: string; en?: string } | undefined | null

/** Prefer Arabic, then English — used across admin/supplier dashboards. */
export function resolveLocalizedField(
  value: LocalizedValue,
  fallback = "—",
): string {
  if (value == null) return fallback
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed || fallback
  }
  const ar = value.ar?.trim()
  const en = value.en?.trim()
  if (DASHBOARD_LANG === "ar") {
    return ar || en || fallback
  }
  return en || ar || fallback
}
