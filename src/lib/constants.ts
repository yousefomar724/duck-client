import {
  LayoutDashboard,
  MapPin,
  Wallet,
  CalendarCheck,
  CalendarDays,
  Ship,
  Users,
  Package,
  User,
  MessageSquare,
  Bell,
  MoreHorizontal,
  BarChart3,
  type LucideIcon,
} from "lucide-react"
import { SITE_TIME_ZONE } from "./time"
import { tripDurationText } from "./trips/duration"
import type { Payout, PayoutStatus } from "./types"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
}

/** Manually maintained marketing stat shown on the landing page location section. */
export const CLIENTS_COUNT = 1200

export const adminNavItems: NavItem[] = [
  {
    title: "الرئيسية",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "التقويم",
    href: "/admin/calendar",
    icon: CalendarDays,
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
  {
    title: "الآراء",
    href: "/admin/feedback",
    icon: MessageSquare,
  },
  {
    title: "التنبيهات",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    title: "التقارير",
    href: "/admin/reports",
    icon: BarChart3,
  },
]

export const supplierNavItems: NavItem[] = [
  {
    title: "الرئيسية",
    href: "/supplier",
    icon: LayoutDashboard,
  },
  {
    title: "التقويم",
    href: "/supplier/calendar",
    icon: CalendarDays,
  },
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
  {
    title: "التنبيهات",
    href: "/supplier/notifications",
    icon: Bell,
  },
  {
    title: "التقارير",
    href: "/supplier/reports",
    icon: BarChart3,
  },
  {
    title: "العملاء",
    href: "/supplier/customers",
    icon: Users,
  },
]

export const adminBottomNavItems: NavItem[] = [
  { title: "الرئيسية", href: "/admin", icon: LayoutDashboard },
  { title: "التقويم", href: "/admin/calendar", icon: CalendarDays },
  { title: "الحجوزات", href: "/admin/bookings", icon: CalendarCheck },
  { title: "التنبيهات", href: "/admin/notifications", icon: Bell },
  { title: "المزيد", href: "/admin/more", icon: MoreHorizontal },
]

export const supplierBottomNavItems: NavItem[] = [
  { title: "الرئيسية", href: "/supplier", icon: LayoutDashboard },
  { title: "التقويم", href: "/supplier/calendar", icon: CalendarDays },
  { title: "الحجوزات", href: "/supplier/bookings", icon: CalendarCheck },
  { title: "التنبيهات", href: "/supplier/notifications", icon: Bell },
  { title: "المزيد", href: "/supplier/more", icon: MoreHorizontal },
]

const NAV_EXACT_HREFS = new Set(["/admin", "/supplier", "/admin/more", "/supplier/more"])

/** Prefix match, with an exact-match special case for dashboard home paths. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (NAV_EXACT_HREFS.has(href)) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
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
    currency,
    numberingSystem: "latn",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
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
    timeZone: SITE_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: SITE_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: SITE_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "—"
  const now = Date.now()
  const diffMs = date.getTime() - now
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" })
  if (Math.abs(diffDays) >= 1) {
    return rtf.format(diffDays, "day")
  }
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))
  if (Math.abs(diffHours) >= 1) {
    return rtf.format(diffHours, "hour")
  }
  const diffMinutes = Math.round(diffMs / (1000 * 60))
  return rtf.format(diffMinutes, "minute")
}

/** Time-only, for pairing with formatDateShort when a booking's date alone isn't enough. */
export function formatTimeShort(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: SITE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

/**
 * "١ ساعة" / "٣ ساعات" for a trip's duration. Trips are hour-long river
 * activities (matches the "N hour(s)" label already shown on the public
 * offers section) even though the field is named/stored generically.
 */
export function formatDurationHours(hours: number | undefined): string | null {
  if (!hours || hours <= 0) return null
  const arabicHourLabels: Record<number, string> = {
    1: "ساعة واحدة",
    2: "ساعتان",
    3: "٣ ساعات",
    4: "٤ ساعات",
    5: "٥ ساعات",
    6: "٦ ساعات",
  }
  return arabicHourLabels[hours] ?? `${hours} ساعة`
}

/**
 * Prefers localized free-text duration so admin lists don't render
 * `"2 to 3 hours ساعة"`. Falls back to the numeric hour label.
 */
export function formatTripDuration(
  trip?: {
    duration?: number
    duration_text?: { ar?: string; en?: string } | string | null
  } | null,
): string | null {
  if (!trip) return null
  const text = tripDurationText(trip, "ar")
  if (text) return text
  return formatDurationHours(trip.duration)
}

/** "ضيف واحد" / "ضيفان" / "٣ ضيوف" for a booking's guest count. */
export function formatGuestsCount(quantity: number | undefined): string | null {
  if (!quantity || quantity <= 0) return null
  if (quantity === 1) return "ضيف واحد"
  if (quantity === 2) return "ضيفان"
  if (quantity <= 10) return `${quantity} ضيوف`
  return `${quantity} ضيف`
}
