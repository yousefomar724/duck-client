import {
  AlertCircle,
  Ban,
  CheckCircle,
  CircleDollarSign,
  Clock,
  RefreshCw,
  RotateCcw,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import type { Booking, BookingStatus } from "@/lib/types"

export type BookingStatusGroup =
  | "needsAction"
  | "upcoming"
  | "completed"
  | "cancelled"

export interface BookingStatusMeta {
  bg: string
  text: string
  label: string
  shortLabel: string
  group: BookingStatusGroup
  icon: LucideIcon
}

export const bookingStatusMeta: Record<BookingStatus, BookingStatusMeta> = {
  PENDING: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    label: "قيد الانتظار",
    shortLabel: "انتظار",
    group: "needsAction",
    icon: Clock,
  },
  CONFIRMED: {
    bg: "bg-duck-cyan/10",
    text: "text-cyan-900",
    label: "مؤكد – قادم",
    shortLabel: "قادم",
    group: "upcoming",
    icon: CheckCircle,
  },
  CANCELLED: {
    bg: "bg-red-100",
    text: "text-red-800",
    label: "ملغي",
    shortLabel: "ملغي",
    group: "cancelled",
    icon: Ban,
  },
  FAILED: {
    bg: "bg-red-100",
    text: "text-red-800",
    label: "فشل",
    shortLabel: "فشل",
    group: "cancelled",
    icon: XCircle,
  },
  SUCCESS: {
    bg: "bg-green-100",
    text: "text-green-800",
    label: "نجح",
    shortLabel: "نجح",
    group: "upcoming",
    icon: CheckCircle,
  },
  REFUND_PENDING: {
    bg: "bg-amber-100",
    text: "text-amber-900",
    label: "في انتظار الاسترداد",
    shortLabel: "استرداد",
    group: "needsAction",
    icon: RefreshCw,
  },
  REFUNDED: {
    bg: "bg-slate-100",
    text: "text-slate-800",
    label: "تم الاسترداد",
    shortLabel: "مسترد",
    group: "cancelled",
    icon: RotateCcw,
  },
  REFUND_FAILED: {
    bg: "bg-red-100",
    text: "text-red-900",
    label: "فشل الاسترداد",
    shortLabel: "فشل الاسترداد",
    group: "needsAction",
    icon: AlertCircle,
  },
  COMPLETED: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    label: "منتهية",
    shortLabel: "منتهية",
    group: "completed",
    icon: CheckCircle,
  },
  PAID: {
    bg: "bg-teal-100",
    text: "text-teal-800",
    label: "مدفوع",
    shortLabel: "مدفوع",
    group: "upcoming",
    icon: CircleDollarSign,
  },
}

export const ALL_BOOKING_STATUSES = Object.keys(
  bookingStatusMeta,
) as BookingStatus[]

export const statusGroupLabels: Record<BookingStatusGroup | "all", string> = {
  all: "الكل",
  needsAction: "تحتاج إجراء",
  upcoming: "قادمة",
  completed: "منتهية",
  cancelled: "ملغاة",
}

export const STATUS_GROUP_KEYS: BookingStatusGroup[] = [
  "needsAction",
  "upcoming",
  "completed",
  "cancelled",
]

export const statusGroupStatuses: Record<
  BookingStatusGroup,
  BookingStatus[]
> = {
  needsAction: ["PENDING", "REFUND_PENDING", "REFUND_FAILED"],
  upcoming: ["CONFIRMED", "PAID", "SUCCESS"],
  completed: ["COMPLETED"],
  cancelled: ["CANCELLED", "FAILED", "REFUNDED"],
}

export function needsAction(booking: Pick<Booking, "status">): boolean {
  return bookingStatusMeta[booking.status]?.group === "needsAction"
}

export function matchesStatusGroup(
  status: BookingStatus,
  group: BookingStatusGroup | "all",
): boolean {
  if (group === "all") return true
  return statusGroupStatuses[group].includes(status)
}

/** Upcoming group and the trip has not started yet. Cron lag can leave CONFIRMED in the past. */
export function isUpcoming(
  booking: Pick<Booking, "status" | "booking_date">,
  now = new Date(),
): boolean {
  if (bookingStatusMeta[booking.status]?.group !== "upcoming") return false
  if (!booking.booking_date) return false
  return new Date(booking.booking_date).getTime() >= now.getTime()
}

export function canAdminCancelBooking(status: string): boolean {
  return (
    status === "PENDING" ||
    status === "CONFIRMED" ||
    status === "SUCCESS" ||
    status === "PAID"
  )
}

export function canSupplierCancelBooking(status: string): boolean {
  return status === "PENDING" || status === "CONFIRMED"
}

export function canEditBooking(status: string): boolean {
  return status === "PENDING" || status === "CONFIRMED"
}

/** Statuses where the supplier can still record money against the booking. */
export const SETTLEABLE_STATUSES: BookingStatus[] = [
  "CONFIRMED",
  "COMPLETED",
  "SUCCESS",
  "PAID",
]

export function canCollectBalance(status: string): boolean {
  return SETTLEABLE_STATUSES.includes(status as BookingStatus)
}

export function canAdminDeleteBooking(role: "admin" | "supplier" | number): boolean {
  return role === "admin" || role === 2
}

export function deleteNeedsStrongConfirm(status: string): boolean {
  return status !== "CANCELLED" && status !== "REFUNDED" && status !== "FAILED"
}

export const resourceLabels: Record<string, string> = {
  kayak: "كاياك",
  water_cycle: "دراجة مائية",
  sup: "التجديف وقوفاً",
}

import { resolveLocalizedField } from "@/lib/dashboard/localize"

export function localizedTripName(
  trip?: { name?: string | { ar: string; en: string } },
): string {
  if (!trip?.name) return "—"
  return resolveLocalizedField(trip.name)
}

export function localizedText(
  value: string | { ar: string; en: string } | undefined,
  maxLen = 200,
): string {
  const s = resolveLocalizedField(value, "")
  if (!s) return "—"
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s
}

export function supplierDisplayName(
  supplier?: { name?: string | { ar: string; en: string } },
): string {
  return resolveLocalizedField(supplier?.name)
}

export function bookingRowId(booking: Booking): string {
  const withLegacy = booking as Booking & { id?: string }
  return booking.ID ?? withLegacy.id ?? ""
}
