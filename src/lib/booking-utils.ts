import type { Booking, BookingStatus, Supplier, Trip } from "@/lib/types"
import { resourceTypeLabels, ACTIVE_BOOKING_STATUSES } from "@/lib/constants"

export function bookingRowId(booking: Booking): number {
  const withLegacy = booking as Booking & { id?: number }
  return booking.ID ?? withLegacy.id ?? 0
}

export function localizedText(
  value: string | { ar: string; en: string } | undefined,
  maxLen = 200,
): string {
  if (!value) return "—"
  const s = typeof value === "string" ? value : value.ar || value.en || ""
  if (!s) return "—"
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s
}

export function localizedTripName(trip?: Trip): string {
  if (!trip) return "—"
  const n = trip.name
  if (typeof n === "string") return n
  return n.ar || n.en || "—"
}

export function getTripNameForBooking(booking: Booking, trip?: Trip): string {
  if (trip) return localizedTripName(trip)
  if (booking.trip) return localizedTripName(booking.trip)
  return "—"
}

export function getSupplierName(supplier?: Supplier): string {
  if (!supplier) return "—"
  return typeof supplier.name === "string"
    ? supplier.name
    : supplier.name.ar || supplier.name.en || "—"
}

export function getResourceLabel(resourceType?: string): string {
  if (!resourceType) return "—"
  return resourceTypeLabels[resourceType] ?? resourceType
}

export function getBookingCreatedAt(booking: Booking): string | undefined {
  return booking.created_at ?? booking.CreatedAt ?? booking.UpdatedAt
}

export function canAdminCancelBooking(status: BookingStatus | string): boolean {
  return status === "CONFIRMED" || status === "SUCCESS" || status === "PAID"
}

export type BookingSortField =
  | "created_desc"
  | "created_asc"
  | "date_desc"
  | "date_asc"
  | "amount_desc"
  | "amount_asc"

export const bookingSortOptions: { value: BookingSortField; label: string }[] = [
  { value: "created_desc", label: "الأحدث إنشاءً" },
  { value: "created_asc", label: "الأقدم إنشاءً" },
  { value: "date_desc", label: "أقرب موعد" },
  { value: "date_asc", label: "أبعد موعد" },
  { value: "amount_desc", label: "الأعلى سعراً" },
  { value: "amount_asc", label: "الأقل سعراً" },
]

export function sortBookings(
  bookings: Booking[],
  sort: BookingSortField,
): Booking[] {
  const copy = [...bookings]
  copy.sort((a, b) => {
    switch (sort) {
      case "created_desc":
        return (
          new Date(getBookingCreatedAt(b) ?? 0).getTime() -
          new Date(getBookingCreatedAt(a) ?? 0).getTime()
        )
      case "created_asc":
        return (
          new Date(getBookingCreatedAt(a) ?? 0).getTime() -
          new Date(getBookingCreatedAt(b) ?? 0).getTime()
        )
      case "date_desc":
        return (
          new Date(b.booking_date ?? 0).getTime() -
          new Date(a.booking_date ?? 0).getTime()
        )
      case "date_asc":
        return (
          new Date(a.booking_date ?? 0).getTime() -
          new Date(b.booking_date ?? 0).getTime()
        )
      case "amount_desc":
        return b.amount - a.amount
      case "amount_asc":
        return a.amount - b.amount
      default:
        return 0
    }
  })
  return copy
}

export function filterBookings(
  bookings: Booking[],
  {
    search,
    status,
    payment,
  }: {
    search: string
    status: BookingStatus | "all" | "active"
    payment: "all" | "KASHIER" | "MANUAL"
  },
): Booking[] {
  const q = search.trim().toLowerCase()

  return bookings.filter((booking) => {
    if (status === "active") {
      if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) return false
    } else if (status !== "all" && booking.status !== status) {
      return false
    }
    if (payment !== "all" && booking.payment_method !== payment) return false

    if (!q) return true

    const id = String(bookingRowId(booking))
    const haystack = [
      id,
      booking.full_name,
      booking.phone_number,
      booking.session_id,
      booking.order_id,
      booking.order_ref,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return haystack.includes(q)
  })
}

export const BOOKINGS_PAGE_SIZE = 10

export function paginateBookings<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    totalItems: items.length,
  }
}
