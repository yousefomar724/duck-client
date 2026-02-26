import {
  LayoutDashboard,
  MapPin,
  Wallet,
  CalendarCheck,
  Ship,
  type LucideIcon,
} from "lucide-react"
import type { BookingStatus, PayoutStatus } from "./types"

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
}

export const currencies = [
  { value: "EGP", label: "جنيه مصري (EGP)" },
  { value: "USD", label: "دولار أمريكي (USD)" },
  { value: "EUR", label: "يورو (EUR)" },
]

export function formatCurrency(amount: number, currency: string = "EGP"): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: currency,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateString))
}

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString))
}
