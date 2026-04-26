/**
 * Before redirecting to the payment gateway, the booking form stores a slim
 * snapshot in sessionStorage so the success page can show trip/destination
 * details after Kashier redirects back to `/booking/success?order_ref=...`.
 */
export const SUCCESS_CACHE_KEY = "duck.lastBookingContext"

export type SuccessCacheDestination = {
  id: number
  name: { ar: string; en: string }
  lat?: number
  lng?: number
  image?: string
  operating_hours?: string
}

export type SuccessCache = {
  order_ref: string
  trip: {
    id: number
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
