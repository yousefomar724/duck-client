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
  | "active"
  | "done"
  | "dead"

export interface BookingStatusMeta {
  bg: string
  text: string
  label: string
  group: BookingStatusGroup
  icon: LucideIcon
}

export const bookingStatusMeta: Record<BookingStatus, BookingStatusMeta> = {
  PENDING: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    label: "قيد الانتظار",
    group: "needsAction",
    icon: Clock,
  },
  CONFIRMED: {
    bg: "bg-duck-cyan/10",
    text: "text-duck-cyan",
    label: "مؤكد",
    group: "active",
    icon: CheckCircle,
  },
  CANCELLED: {
    bg: "bg-red-100",
    text: "text-red-800",
    label: "ملغي",
    group: "dead",
    icon: Ban,
  },
  FAILED: {
    bg: "bg-red-100",
    text: "text-red-800",
    label: "فشل",
    group: "dead",
    icon: XCircle,
  },
  SUCCESS: {
    bg: "bg-green-100",
    text: "text-green-800",
    label: "نجح",
    group: "active",
    icon: CheckCircle,
  },
  REFUND_PENDING: {
    bg: "bg-amber-100",
    text: "text-amber-900",
    label: "في انتظار الاسترداد",
    group: "needsAction",
    icon: RefreshCw,
  },
  REFUNDED: {
    bg: "bg-slate-100",
    text: "text-slate-800",
    label: "تم الاسترداد",
    group: "done",
    icon: RotateCcw,
  },
  REFUND_FAILED: {
    bg: "bg-red-100",
    text: "text-red-900",
    label: "فشل الاسترداد",
    group: "needsAction",
    icon: AlertCircle,
  },
  COMPLETED: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    label: "مكتمل",
    group: "done",
    icon: CheckCircle,
  },
  PAID: {
    bg: "bg-teal-100",
    text: "text-teal-800",
    label: "مدفوع",
    group: "active",
    icon: CircleDollarSign,
  },
}

export const ALL_BOOKING_STATUSES = Object.keys(
  bookingStatusMeta,
) as BookingStatus[]

export const statusGroupLabels: Record<BookingStatusGroup | "all", string> = {
  all: "الكل",
  needsAction: "تحتاج إجراء",
  active: "نشط",
  done: "منتهي",
  dead: "ملغي / فشل",
}

export const statusGroupStatuses: Record<
  BookingStatusGroup,
  BookingStatus[]
> = {
  needsAction: ["PENDING", "REFUND_PENDING", "REFUND_FAILED"],
  active: ["CONFIRMED", "PAID", "SUCCESS"],
  done: ["COMPLETED", "REFUNDED"],
  dead: ["CANCELLED", "FAILED"],
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

export function canAdminCancelBooking(status: string): boolean {
  return status === "CONFIRMED" || status === "SUCCESS" || status === "PAID"
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
