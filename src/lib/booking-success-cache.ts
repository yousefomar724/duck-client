/**
 * Before redirecting to the payment gateway, the booking form stores a slim
 * snapshot in sessionStorage so the success page can show trip/destination
 * details after Kashier redirects back to `/booking/success?order_ref=...`.
 */
import type { Booking } from "@/lib/types"

export const SUCCESS_CACHE_KEY = "duck.lastBookingContext"

export type SuccessCacheDestination = {
  id: string
  name: { ar: string; en: string }
  lat?: number
  lng?: number
  image?: string
  operating_hours?: string
}

export type SuccessCache = {
  order_ref: string
  trip: {
    id: string
    name: { ar: string; en: string }
    currency: string
    refundable: boolean
    cancelation_policy?: { ar: string; en: string }
    destinations: SuccessCacheDestination[]
  }
  summary: {
    full_name: string
    booking_date: string
    quantity: number
    local_guests: number
    foreigner_guests: number
    adults?: number
    kids_1_6?: number
    kids_7_12?: number
    amount: number
  }
}

export function readLastBookingContext(): SuccessCache | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(SUCCESS_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SuccessCache
  } catch {
    return null
  }
}

export function clearLastBookingContext(): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(SUCCESS_CACHE_KEY)
  } catch {
    /* ignore */
  }
}

export const PENDING_INSTAPAY_KEY = "duck.pendingInstapay"

/**
 * The InstaPay step lives in localStorage, not sessionStorage: paying means
 * leaving for the InstaPay app, and mobile browsers often discard the tab (or
 * the user comes back in a new one), which used to lose the booking ref and
 * the "send receipt" button. Kept for two days so a shared device doesn't hold
 * on to someone's booking.
 */
export const PENDING_INSTAPAY_TTL_MS = 48 * 60 * 60 * 1000

export type PendingInstapay = {
  booking: Booking
  chosenAmount: number
}

type StoredPendingInstapay = PendingInstapay & { saved_at: number }

export function readPendingInstapay(now: number = Date.now()): PendingInstapay | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(PENDING_INSTAPAY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredPendingInstapay
    const booking = parsed?.booking
    if (
      !booking || typeof booking !== "object" ||
      typeof booking.ID !== "string" || !booking.ID ||
      typeof booking.trip_id !== "string" || !booking.trip_id ||
      typeof booking.amount !== "number" || !Number.isFinite(booking.amount) || booking.amount < 0 ||
      typeof booking.currency !== "string" || !/^[A-Z]{3}$/.test(booking.currency) ||
      typeof parsed.chosenAmount !== "number" || !Number.isFinite(parsed.chosenAmount) || parsed.chosenAmount < 0
    ) return null
    const bookingTime = booking.booking_date ? Date.parse(booking.booking_date) : NaN
    if (
      typeof parsed.saved_at !== "number" ||
      now - parsed.saved_at > PENDING_INSTAPAY_TTL_MS ||
      (Number.isFinite(bookingTime) && bookingTime < now)
    ) {
      localStorage.removeItem(PENDING_INSTAPAY_KEY)
      return null
    }
    return { booking, chosenAmount: parsed.chosenAmount }
  } catch {
    return null
  }
}

export function writePendingInstapay(payload: PendingInstapay): void {
  if (typeof window === "undefined") return
  try {
    const stored: StoredPendingInstapay = { ...payload, saved_at: Date.now() }
    localStorage.setItem(PENDING_INSTAPAY_KEY, JSON.stringify(stored))
  } catch {
    /* storage full or disabled */
  }
}

export function clearPendingInstapay(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(PENDING_INSTAPAY_KEY)
  } catch {
    /* ignore */
  }
}
