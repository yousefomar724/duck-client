import { siteWallClock, siteWallTimeToUtc } from "@/lib/time"

/**
 * The date-time picker reads and writes a Date's *local* fields, while codes
 * expire on Cairo time. Loading goes through `siteWallClock` and saving through
 * `siteWallTimeToUtc`, so opening and saving a code never moves its expiry,
 * whatever time zone the browser is in.
 */
export function instantToCairoPicker(iso: string | Date | null | undefined): Date | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return siteWallClock(date)
}

export function cairoPickerToInstant(picked: Date | undefined | null): Date | null {
  if (!picked) return null
  const ymd = `${picked.getFullYear()}-${String(picked.getMonth() + 1).padStart(2, "0")}-${String(picked.getDate()).padStart(2, "0")}`
  return siteWallTimeToUtc(ymd, picked.getHours(), picked.getMinutes())
}

/** The picker has minute precision, so an untouched expiry may lose its seconds. */
export function sameMinute(a: Date | string | null | undefined, b: Date | string | null | undefined) {
  if (!a || !b) return !a && !b
  return Math.floor(new Date(a).getTime() / 60_000) === Math.floor(new Date(b).getTime() / 60_000)
}

export interface DiscountDraft {
  type: "percentage" | "fixed"
  value: number
  currency: string
  /** Real instants (UTC), not picker values. */
  expiresAt: Date | null
  startsAt?: Date | null
  /** Expiry the code already has. Keeping it is allowed even once it has passed. */
  currentExpiresAt?: Date | string | null
}

/** Client-side checks that match the API, so the form can explain a bad draft. */
export function discountDraftError(draft: DiscountDraft, now = new Date()): string | null {
  const keepsExpiry =
    draft.currentExpiresAt != null && sameMinute(draft.expiresAt, draft.currentExpiresAt)
  if (draft.type === "percentage" && (draft.value < 1 || draft.value > 100)) {
    return "percentRange"
  }
  if (draft.type === "fixed" && !(draft.value > 0)) {
    return "percentRange"
  }
  if (draft.type === "fixed" && !draft.currency.trim()) {
    return "currencyRequired"
  }
  if (!draft.expiresAt || (!keepsExpiry && draft.expiresAt.getTime() <= now.getTime())) {
    return "pastExpiry"
  }
  if (draft.startsAt && draft.startsAt.getTime() >= draft.expiresAt.getTime()) {
    return "pastExpiry"
  }
  return null
}
