import {
  LayoutDashboard,
  MapPin,
  Wallet,
  CalendarCheck,
  Ship,
  Users,
  Package,
  User,
  type LucideIcon,
} from "lucide-react"
import type { BookingStatus, Payout, PayoutStatus } from "./types"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
}

export const adminNavItems: NavItem[] = [
  {
    title: "لوحة التحكم",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "الوجهات",
    href: "/admin/destinations",
    icon: MapPin,
  },
  {
    title: "الرحلات",
    href: "/admin/trips",
    icon: Ship,
  },
  {
    title: "المدفوعات",
    href: "/admin/payouts",
    icon: Wallet,
  },
  {
    title: "الحجوزات",
    href: "/admin/bookings",
    icon: CalendarCheck,
  },
  {
    title: "الموردين",
    href: "/admin/suppliers",
    icon: Users,
  },
  {
    title: "المرشدين",
    href: "/admin/tour-guides",
    icon: User,
  },
]

export const supplierNavItems: NavItem[] = [
  {
    title: "رحلاتي",
    href: "/supplier/my-trips",
    icon: Ship,
  },
  {
    title: "الحجوزات",
    href: "/supplier/bookings",
    icon: CalendarCheck,
  },
  {
    title: "الملف الشخصي",
    href: "/supplier/profile",
    icon: User,
  },
  {
    title: "سعة المعدات",
    href: "/supplier/storage",
    icon: Package,
  },
]

export const bookingStatusColors: Record<
  BookingStatus,
  { bg: string; text: string; label: string }
> = {
  PENDING: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    label: "قيد الانتظار",
  },
  CONFIRMED: {
    bg: "bg-duck-cyan/10",
    text: "text-duck-cyan",
    label: "مؤكد",
  },
  CANCELLED: {
    bg: "bg-red-100",
    text: "text-red-800",
    label: "ملغي",
  },
  FAILED: {
    bg: "bg-red-100",
    text: "text-red-800",
    label: "فشل",
  },
  SUCCESS: {
    bg: "bg-green-100",
    text: "text-green-800",
    label: "نجح",
  },
  REFUND_PENDING: {
    bg: "bg-amber-100",
    text: "text-amber-900",
    label: "في انتظار الاسترداد",
  },
  REFUNDED: {
    bg: "bg-slate-100",
    text: "text-slate-800",
    label: "تم الاسترداد",
  },
  REFUND_FAILED: {
    bg: "bg-red-100",
    text: "text-red-900",
    label: "فشل الاسترداد",
  },
  COMPLETED: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    label: "مكتمل",
  },
  PAID: {
    bg: "bg-teal-100",
    text: "text-teal-800",
    label: "مدفوع",
  },
}

export type BookingStatusGroup =
  | "pending"
  | "active"
  | "completed"
  | "refund"
  | "cancelled"
  | "failed"

export const bookingStatusGroups: Record<
  BookingStatus,
  { group: BookingStatusGroup; label: string }
> = {
  PENDING: { group: "pending", label: "قيد الانتظار" },
  CONFIRMED: { group: "active", label: "نشط / مدفوع" },
  SUCCESS: { group: "active", label: "نشط / مدفوع" },
  PAID: { group: "active", label: "نشط / مدفوع" },
  COMPLETED: { group: "completed", label: "مكتمل" },
  REFUND_PENDING: { group: "refund", label: "استرداد" },
  REFUNDED: { group: "refund", label: "استرداد" },
  REFUND_FAILED: { group: "refund", label: "استرداد" },
  CANCELLED: { group: "cancelled", label: "ملغي" },
  FAILED: { group: "failed", label: "فشل" },
}

export const ALL_BOOKING_STATUSES: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "FAILED",
  "SUCCESS",
  "REFUND_PENDING",
  "REFUNDED",
  "REFUND_FAILED",
  "COMPLETED",
  "PAID",
]

/** Statuses counted as paid/active for KPI cards and filters. */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  "CONFIRMED",
  "SUCCESS",
  "PAID",
  "COMPLETED",
]

export function isActiveBookingStatus(status: BookingStatus): boolean {
  return ACTIVE_BOOKING_STATUSES.includes(status)
}

export function getBookingStatusLabel(status: BookingStatus): string {
  return bookingStatusColors[status]?.label ?? status
}

export const paymentMethodLabels: Record<
  NonNullable<import("./types").Booking["payment_method"]>,
  string
> = {
  KASHIER: "كاشير",
  MANUAL: "إنستاباي / يدوي",
}

export const resourceTypeLabels: Record<string, string> = {
  kayak: "كاياك",
  water_cycle: "دراجة مائية",
  sup: "التجديف وقوفاً",
}

export const payoutStatusColors: Record<
  PayoutStatus,
  { bg: string; text: string; label: string }
> = {
  pending: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    label: "قيد الانتظار",
  },
  paid: {
    bg: "bg-green-100",
    text: "text-green-800",
    label: "مدفوع",
  },
  failed: {
    bg: "bg-red-100",
    text: "text-red-800",
    label: "فشل",
  },
  success: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    label: "نجح",
  },
  confirmed: {
    bg: "bg-teal-100",
    text: "text-teal-800",
    label: "مؤكد",
  },
}

export const currencies = [
  { value: "EGP", label: "جنيه مصري (EGP)" },
  { value: "USD", label: "دولار أمريكي (USD)" },
  { value: "EUR", label: "يورو (EUR)" },
]

export function formatCurrency(
  amount: number,
  currency: string = "EGP",
  locale?: string,
): string {
  const intlLocale = locale === "en" ? "en-US" : "ar-EG"
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: currency,
  }).format(amount)
}

/** Statuses treated as “paid” for totals and the مدفوع tab (matches backend wallet debit). */
export const PAID_PAYOUT_STATUSES = ["paid", "success", "confirmed"] as const

export function isPaidPayoutStatus(status: string): boolean {
  return (PAID_PAYOUT_STATUSES as readonly string[]).includes(status)
}

/** Resolve display date from payout (mock `date`, or API `CreatedAt` / `created_at`). */
export function getPayoutDateString(p: Payout): string {
  return p.date ?? p.CreatedAt ?? p.created_at ?? ""
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}
