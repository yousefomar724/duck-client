"use client"

import { useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  isAfter,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import type { Booking, BookingStatus, Supplier, Trip } from "@/lib/types"
import {
  bookingStatusMeta,
  matchesStatusGroup,
  type BookingStatusGroup,
} from "@/lib/bookings/status"
import { localizedTripName, supplierDisplayName } from "@/lib/bookings/status"

export type DatePreset = "all" | "today" | "week" | "month" | "upcoming"

export interface BookingFilters {
  search: string
  statusGroup: BookingStatusGroup | "all"
  status: BookingStatus | "all"
  paymentMethod: "all" | "MANUAL" | "KASHIER"
  supplierId: string
  tripType: "all" | "trip" | "tour"
  datePreset: DatePreset
}

const DEFAULT_FILTERS: BookingFilters = {
  search: "",
  statusGroup: "all",
  status: "all",
  paymentMethod: "all",
  supplierId: "all",
  tripType: "all",
  datePreset: "all",
}

export function parseFilters(params: URLSearchParams): BookingFilters {
  const statusGroup = params.get("group") as BookingStatusGroup | "all" | null
  const status = params.get("status") as BookingStatus | "all" | null
  const payment = params.get("payment") as BookingFilters["paymentMethod"] | null
  const supplierId = params.get("supplier")
  const tripType = params.get("tripType") as BookingFilters["tripType"] | null
  const datePreset = params.get("date") as DatePreset | null

  return {
    search: params.get("q") ?? "",
    statusGroup:
      statusGroup && ["all", "needsAction", "active", "done", "dead"].includes(statusGroup)
        ? statusGroup
        : "all",
    status: status && status !== "all" ? status : "all",
    paymentMethod:
      payment && ["all", "MANUAL", "KASHIER"].includes(payment) ? payment : "all",
    supplierId: supplierId ?? "all",
    tripType:
      tripType && ["all", "trip", "tour"].includes(tripType) ? tripType : "all",
    datePreset:
      datePreset && ["all", "today", "week", "month", "upcoming"].includes(datePreset)
        ? datePreset
        : "all",
  }
}

export function filtersToParams(filters: BookingFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.search) params.set("q", filters.search)
  if (filters.statusGroup !== "all") params.set("group", filters.statusGroup)
  if (filters.status !== "all") params.set("status", filters.status)
  if (filters.paymentMethod !== "all") params.set("payment", filters.paymentMethod)
  if (filters.supplierId !== "all") params.set("supplier", filters.supplierId)
  if (filters.tripType !== "all") params.set("tripType", filters.tripType)
  if (filters.datePreset !== "all") params.set("date", filters.datePreset)
  return params
}

export function matchesDatePreset(bookingDate: string | undefined, preset: DatePreset): boolean {
  if (preset === "all" || !bookingDate) return preset === "all"
  const date = new Date(bookingDate)
  if (isNaN(date.getTime())) return false
  const now = new Date()

  switch (preset) {
    case "today":
      return isWithinInterval(date, {
        start: startOfDay(now),
        end: endOfDay(now),
      })
    case "week":
      return isWithinInterval(date, {
        start: startOfWeek(now, { weekStartsOn: 6 }),
        end: endOfWeek(now, { weekStartsOn: 6 }),
      })
    case "month":
      return isWithinInterval(date, {
        start: startOfMonth(now),
        end: endOfMonth(now),
      })
    case "upcoming":
      return isAfter(date, endOfDay(now))
    default:
      return true
  }
}

export function filterBookingsList(
  bookings: Booking[],
  filters: BookingFilters,
  trips: Trip[],
  suppliers: Supplier[],
): Booking[] {
  const tripMap = new Map(trips.map((t) => [t.id, t]))
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]))

  return bookings.filter((booking) => {
    const trip = booking.trip ?? tripMap.get(booking.trip_id)
    const supplier = booking.supplier ?? supplierMap.get(booking.supplier_id)

    if (filters.status !== "all" && booking.status !== filters.status) {
      return false
    }
    if (
      filters.statusGroup !== "all" &&
      !matchesStatusGroup(booking.status, filters.statusGroup)
    ) {
      return false
    }
    if (
      filters.paymentMethod !== "all" &&
      booking.payment_method !== filters.paymentMethod
    ) {
      return false
    }
    if (
      filters.supplierId !== "all" &&
      booking.supplier_id !== filters.supplierId
    ) {
      return false
    }
    if (filters.tripType === "trip" && trip?.is_tour) return false
    if (filters.tripType === "tour" && !trip?.is_tour) return false
    if (!matchesDatePreset(booking.booking_date, filters.datePreset)) {
      return false
    }

    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase()
      const haystack = [
        booking.ID,
        booking.full_name,
        booking.phone_number,
        booking.order_id,
        booking.order_ref,
        localizedTripName(trip),
        supplierDisplayName(supplier),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }

    return true
  })
}

export function bookingsToCsv(bookings: Booking[]): string {
  const headers = [
    "رقم الحجز",
    "اسم العميل",
    "الهاتف",
    "الرحلة",
    "تاريخ الحجز",
    "المبلغ",
    "العملة",
    "الحالة",
    "طريقة الدفع",
    "الكمية",
  ]
  const rows = bookings.map((b) => [
    b.ID,
    b.full_name,
    b.phone_number,
    localizedTripName(b.trip),
    b.booking_date ?? "",
    String(b.amount),
    b.currency,
    bookingStatusMeta[b.status]?.label ?? b.status,
    b.payment_method ?? "",
    String(b.quantity ?? ""),
  ])

  return [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n")
}

export function useBookingFilters(role: "admin" | "supplier") {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filters = useMemo(
    () => parseFilters(searchParams),
    [searchParams],
  )

  const setFilters = useCallback(
    (patch: Partial<BookingFilters>) => {
      const next = { ...filters, ...patch }
      const params = filtersToParams(next)
      const qs = params.toString()
      const base = role === "admin" ? "/admin/bookings" : "/supplier/bookings"
      router.replace(qs ? `${base}?${qs}` : base, { scroll: false })
    },
    [filters, router, role],
  )

  const clearFilters = useCallback(() => {
    const base = role === "admin" ? "/admin/bookings" : "/supplier/bookings"
    router.replace(base, { scroll: false })
  }, [router, role])

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search.trim() !== "" ||
      filters.statusGroup !== "all" ||
      filters.status !== "all" ||
      filters.paymentMethod !== "all" ||
      filters.supplierId !== "all" ||
      filters.tripType !== "all" ||
      filters.datePreset !== "all"
    )
  }, [filters])

  const filterBookings = useCallback(
    (
      bookings: Booking[],
      trips: Trip[],
      suppliers: Supplier[],
    ): Booking[] => filterBookingsList(bookings, filters, trips, suppliers),
    [filters],
  )

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = []

    if (filters.statusGroup !== "all") {
      const labels: Record<BookingStatusGroup, string> = {
        needsAction: "تحتاج إجراء",
        active: "نشط",
        done: "منتهي",
        dead: "ملغي / فشل",
      }
      chips.push({
        key: "group",
        label: labels[filters.statusGroup],
        onRemove: () => setFilters({ statusGroup: "all" }),
      })
    }
    if (filters.status !== "all") {
      chips.push({
        key: "status",
        label: bookingStatusMeta[filters.status].label,
        onRemove: () => setFilters({ status: "all" }),
      })
    }
    if (filters.paymentMethod !== "all") {
      chips.push({
        key: "payment",
        label: filters.paymentMethod === "MANUAL" ? "يدوي" : "كاشير",
        onRemove: () => setFilters({ paymentMethod: "all" }),
      })
    }
    if (filters.datePreset !== "all") {
      const dateLabels: Record<DatePreset, string> = {
        all: "الكل",
        today: "اليوم",
        week: "هذا الأسبوع",
        month: "هذا الشهر",
        upcoming: "القادمة",
      }
      chips.push({
        key: "date",
        label: dateLabels[filters.datePreset],
        onRemove: () => setFilters({ datePreset: "all" }),
      })
    }

    return chips
  }, [filters, setFilters])

  return {
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
    filterBookings,
    activeFilterChips,
    DEFAULT_FILTERS,
  }
}

export function exportBookingsCsv(bookings: Booking[], filename = "bookings.csv") {
  const csv = bookingsToCsv(bookings)

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
