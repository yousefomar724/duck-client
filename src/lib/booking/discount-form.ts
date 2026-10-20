import { siteWallClock, siteWallTimeToUtc } from "@/lib/time"
import { applyDiscount, DISCOUNT_CODE_PATTERN, type DiscountRule } from "@/lib/booking/discount"

/** What the form offers. "free" is stored as a 100% percentage code. */
export type DiscountKind = "percentage" | "fixed" | "free"

export function discountKindOf(type: "percentage" | "fixed", value: number): DiscountKind {
  if (type === "percentage" && value === 100) return "free"
  return type
}

/** The rule a form kind saves as. */
export function discountRuleFor(
  kind: DiscountKind,
  value: number,
  maxDiscount: number | null,
): DiscountRule {
  if (kind === "free") return { type: "percentage", value: 100, max_discount: null }
  if (kind === "fixed") return { type: "fixed", value, max_discount: null }
  return { type: "percentage", value, max_discount: maxDiscount }
}

// No 0/O or 1/I, so a code read aloud or from a screenshot is typed right.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function generateDiscountCode(random: () => number = Math.random): string {
  let out = ""
  for (let i = 0; i < 8; i += 1) out += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]
  return out
}

/** True when the typed code would be accepted (case and outer spaces do not matter). */
export function isValidDraftCode(raw: string): boolean {
  return DISCOUNT_CODE_PATTERN.test(raw.trim().toUpperCase())
}

/** A picker value for 23:59 Cairo time, `days` days from today in Cairo. */
export function expiryInDays(days: number, now = new Date()): Date {
  const picked = siteWallClock(now)
  picked.setDate(picked.getDate() + days)
  picked.setHours(23, 59, 0, 0)
  return picked
}

export interface DiscountPreview {
  discount: number
  total: number
  /** The example booking is under the code's minimum, so a customer would be refused. */
  belowMinimum: boolean
  /** The maximum discount cut the percentage down. */
  capped: boolean
}

/** Prices an example booking exactly as checkout does. */
export function previewDiscount(input: {
  kind: DiscountKind
  value: number
  maxDiscount: number | null
  minBooking: number | null
  subtotal: number
}): DiscountPreview {
  const rule = discountRuleFor(input.kind, input.value, input.maxDiscount)
  const applied = applyDiscount(input.subtotal, rule)
  const uncapped = applyDiscount(input.subtotal, { ...rule, max_discount: null })
  return {
    discount: applied.discount,
    total: applied.total,
    belowMinimum: input.minBooking != null && input.subtotal < input.minBooking,
    capped: applied.discount < uncapped.discount,
  }
}

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
