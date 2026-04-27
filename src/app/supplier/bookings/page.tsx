/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { Fragment, useState, useEffect, useCallback } from "react"
import PageHeader from "@/components/shared/page-header"
import StatusBadge from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import StatCard from "@/components/shared/stat-card"
import { formatCurrency, formatDateTime } from "@/lib/constants"
import * as bookingsApi from "@/lib/api/bookings"
import * as tripsApi from "@/lib/api/trips"
import * as tourGuidesApi from "@/lib/api/tour-guides"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import type {
  Booking,
  BookingStatus,
  TourGuide,
  Trip,
  Supplier,
} from "@/lib/types"
import { useToast } from "@/lib/stores/toast-store"
import { CalendarCheck, CheckCircle, ChevronDown, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

const ALL_FILTER_VALUES = [
  "all",
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "SUCCESS",
  "PAID",
  "REFUND_PENDING",
  "REFUNDED",
  "CANCELLED",
  "FAILED",
  "REFUND_FAILED",
] as const

const filterLabels: Record<(typeof ALL_FILTER_VALUES)[number], string> = {
  all: "الكل",
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكد",
  COMPLETED: "مكتمل",
  SUCCESS: "نجح",
  PAID: "مدفوع",
  REFUND_PENDING: "في انتظار الاسترداد",
  REFUNDED: "تم الاسترداد",
  CANCELLED: "ملغي",
  FAILED: "فشل",
  REFUND_FAILED: "فشل الاسترداد",
}

const resourceLabels: Record<string, string> = {
  kayak: "كاياك",
  water_cycle: "دراجة مائية",
  sup: "التجديف وقوفاً",
}

/** Chevron + 4 summary columns */
const TABLE_COL_COUNT = 5

function bookingRowId(booking: Booking): number {
  const withLegacy = booking as Booking & { id?: number }
  return booking.ID ?? withLegacy.id ?? 0
}

function localizedTripNameFromTrip(trip?: Trip) {
  if (!trip) return "—"
  const n = trip.name
  if (typeof n === "string") return n
  return n.ar || n.en || "—"
}

function localizedText(
  value: string | { ar: string; en: string } | undefined,
  maxLen = 200,
) {
  if (!value) return "—"
  const s = typeof value === "string" ? value : value.ar || value.en || ""
  if (!s) return "—"
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s
}

function supplierDisplayName(supplier?: Supplier) {
  if (!supplier) return "—"
  if (typeof supplier.name === "string") return supplier.name
  return supplier.name.ar || supplier.name.en || "—"
}

export default function SupplierBookingsPage() {
  const { addToast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [tourGuides, setTourGuides] = useState<TourGuide[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [guideUpdating, setGuideUpdating] = useState<number | null>(null)
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(
    null,
  )

  const toggleExpanded = (id: number) => {
    setExpandedBookingId((prev) => (prev === id ? null : id))
  }

  const fetchBookings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const [bookingsRes, guidesRes] = await Promise.all([
      bookingsApi.getMyBookings(),
      tourGuidesApi.getTourGuides(),
    ])
    if (bookingsRes.error) {
      setError(bookingsRes.error)
    } else {
      setBookings(bookingsRes.data || [])
    }
    setTourGuides(guidesRes.data || [])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const id = setTimeout(() => fetchBookings(), 0)
    return () => clearTimeout(id)
  }, [fetchBookings])

  // Filter bookings by status
  let filteredBookings = bookings
  if (statusFilter !== "all") {
    filteredBookings = bookings.filter(
      (booking) => booking.status === statusFilter,
    )
  }

  const totalCount = bookings.length
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length
  const pendingCount = bookings.filter((b) => b.status === "PENDING").length

  const handleGuideChange = async (tripId: number, guideId: string) => {
    setGuideUpdating(tripId)
    const payload: Record<string, unknown> = {
      tour_guide_id: guideId === "none" ? 0 : parseInt(guideId, 10),
    }
    const { error: err } = await tripsApi.updateTrip(tripId, payload as any)
    setGuideUpdating(null)
    if (err) {
      addToast(err, "error")
      return
    }
    addToast("تم تحديث المرشد", "success")
    await fetchBookings()
  }

  // Get trip name for a booking
  const getTripName = (booking: Booking) => {
    if (booking.trip) {
      return typeof booking.trip.name === "string"
        ? booking.trip.name
        : booking.trip.name.ar
    }
    return "غير معروف"
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="الحجوزات" />
        <TableSkeleton rows={5} columns={TABLE_COL_COUNT} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="الحجوزات" />
        <ErrorDisplay error={error} onRetry={fetchBookings} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الحجوزات" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="إجمالي الحجوزات"
          value={totalCount}
          icon={CalendarCheck}
        />
        <StatCard
          title="حجوزات مؤكدة"
          value={confirmedCount}
          icon={CheckCircle}
        />
        <StatCard
          title="حجوزات قيد الانتظار"
          value={pendingCount}
          icon={Clock}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select dir="rtl" value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="تصفية حسب الحالة" />
          </SelectTrigger>
          <SelectContent>
            {ALL_FILTER_VALUES.map((v) => (
              <SelectItem key={v} value={v}>
                {filterLabels[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>
            {statusFilter === "all"
              ? "جميع الحجوزات"
              : `الحجوزات - ${filterLabels[statusFilter as (typeof ALL_FILTER_VALUES)[number]] ?? statusFilter}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-muted">لا توجد حجوزات متاحة</p>
            </div>
          ) : (
            <Table className="min-w-[520px] overflow-x-auto max-w-full text-xs sm:text-sm">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10 text-right p-2" aria-hidden />
                  <TableHead className="text-right">رقم الحجز</TableHead>
                  <TableHead className="text-right">اسم العميل</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => {
                  const rowId = bookingRowId(booking)
                  const rt = booking.resource_type
                    ? (resourceLabels[booking.resource_type] ??
                      booking.resource_type)
                    : "—"
                  const isExpanded = expandedBookingId === rowId
                  const trip = booking.trip
                  return (
                    <Fragment
                      key={`${rowId}-${booking.trip_id}-${booking.session_id}`}
                    >
                      <TableRow
                        className={cn(
                          "hover:bg-duck-cyan/5 cursor-pointer transition-colors",
                          isExpanded && "bg-duck-cyan/10",
                        )}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        aria-label={`تفاصيل الحجز رقم ${rowId}`}
                        onClick={() => toggleExpanded(rowId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            toggleExpanded(rowId)
                          }
                        }}
                      >
                        <TableCell className="w-10 p-2 align-middle">
                          <ChevronDown
                            className={cn(
                              "size-4 text-text-muted transition-transform",
                              isExpanded && "rotate-180",
                            )}
                            aria-hidden
                          />
                        </TableCell>
                        <TableCell className="font-medium">#{rowId}</TableCell>
                        <TableCell>{booking.full_name}</TableCell>
                        <TableCell className="font-bold text-duck-navy whitespace-nowrap">
                          {formatCurrency(booking.amount, booking.currency)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={booking.status as BookingStatus}
                            type="booking"
                          />
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell
                            colSpan={TABLE_COL_COUNT}
                            className="p-0 border-t-0"
                          >
                            <div
                              className="border-t border-border bg-muted/20 px-3 py-4 sm:px-5"
                              dir="rtl"
                            >
                              <p className="text-sm font-semibold text-duck-navy mb-3">
                                تفاصيل الحجز
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                                <div>
                                  <div className="text-text-muted text-xs mb-0.5">
                                    رقم الهاتف
                                  </div>
                                  <div className="font-mono text-sm">
                                    {booking.phone_number || "—"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-text-muted text-xs mb-0.5">
                                    النوع
                                  </div>
                                  <div>
                                    <span
                                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                                        trip?.is_tour
                                          ? "bg-purple-100 text-purple-700"
                                          : "bg-blue-100 text-blue-700"
                                      }`}
                                    >
                                      {trip?.is_tour ? "جولة" : "رحلة"}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-text-muted text-xs mb-0.5">
                                    اسم الرحلة
                                  </div>
                                  <div>{getTripName(booking)}</div>
                                </div>
                                <div>
                                  <div className="text-text-muted text-xs mb-0.5">
                                    تاريخ الحجز
                                  </div>
                                  <div>
                                    {booking.booking_date
                                      ? formatDateTime(booking.booking_date)
                                      : "—"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-text-muted text-xs mb-0.5">
                                    المعدّات
                                  </div>
                                  <div>{rt}</div>
                                </div>
                                <div>
                                  <div className="text-text-muted text-xs mb-0.5">
                                    الكمية
                                  </div>
                                  <div>{booking.quantity ?? "—"}</div>
                                </div>
                                <div>
                                  <div className="text-text-muted text-xs mb-0.5">
                                    تاريخ الإنشاء
                                  </div>
                                  <div>
                                    {booking.created_at
                                      ? formatDateTime(booking.created_at)
                                      : "—"}
                                  </div>
                                </div>
                                <div
                                  className="sm:col-span-2 lg:col-span-1"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <div className="text-text-muted text-xs mb-0.5">
                                    المرشد
                                  </div>
                                  <div>
                                    {trip?.is_tour ? (
                                      <Select
                                        dir="rtl"
                                        value={
                                          trip.tour_guide_id?.toString() ||
                                          "none"
                                        }
                                        onValueChange={(v) =>
                                          handleGuideChange(booking.trip_id, v)
                                        }
                                        disabled={
                                          guideUpdating === booking.trip_id
                                        }
                                      >
                                        <SelectTrigger className="w-full max-w-[220px] h-9 text-xs">
                                          <SelectValue placeholder="اختر مرشد" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">
                                            بدون مرشد
                                          </SelectItem>
                                          {tourGuides.map((g) => (
                                            <SelectItem
                                              key={g.ID}
                                              value={g.ID.toString()}
                                            >
                                              {g.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      "—"
                                    )}
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-duck-navy mt-6 mb-3">
                                بيانات إضافية
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                                <div>
                                  <div className="text-text-muted text-xs mb-0.5">
                                    معرف الجلسة
                                  </div>
                                  <div className="font-mono break-all whitespace-pre-wrap">
                                    {booking.session_id || "—"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-text-muted text-xs mb-0.5">
                                    رقم الطلب / المرجع
                                  </div>
                                  <div className="font-mono break-all whitespace-pre-wrap">
                                    {[booking.order_id, booking.order_ref]
                                      .filter(Boolean)
                                      .join(" · ") || "—"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-text-muted text-xs mb-0.5">
                                    معرف المستخدم
                                  </div>
                                  <div>{booking.user_id ?? "—"}</div>
                                </div>
                                <div>
                                  <div className="text-text-muted text-xs mb-0.5">
                                    طلب مرشد
                                  </div>
                                  <div>
                                    {booking.wants_guide === undefined
                                      ? "—"
                                      : booking.wants_guide
                                        ? "نعم"
                                        : "لا"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-text-muted text-xs mb-0.5">
                                    معرف الرحلة
                                  </div>
                                  <div>{booking.trip_id}</div>
                                </div>
                                <div>
                                  <div className="text-text-muted text-xs mb-0.5">
                                    معرف المورد
                                  </div>
                                  <div>{booking.supplier_id ?? "—"}</div>
                                </div>
                                {booking.user && (
                                  <div className="sm:col-span-2">
                                    <div className="text-text-muted text-xs mb-0.5">
                                      حساب العميل
                                    </div>
                                    <div>
                                      {[
                                        booking.user.first_name,
                                        booking.user.last_name,
                                      ]
                                        .filter(Boolean)
                                        .join(" ")}{" "}
                                      {booking.user.email
                                        ? `· ${booking.user.email}`
                                        : ""}
                                    </div>
                                  </div>
                                )}
                                {trip && (
                                  <div className="sm:col-span-2 lg:col-span-3 border-t border-border/60 pt-3 mt-1">
                                    <div className="text-text-muted text-xs mb-1">
                                      الرحلة
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <span className="text-text-muted">
                                          الاسم (كامل):{" "}
                                        </span>
                                        {localizedTripNameFromTrip(trip)}
                                      </div>
                                      <div>
                                        <span className="text-text-muted">
                                          من:{" "}
                                        </span>
                                        {trip.from
                                          ? formatDateTime(trip.from)
                                          : "—"}
                                      </div>
                                      <div>
                                        <span className="text-text-muted">
                                          إلى:{" "}
                                        </span>
                                        {trip.to
                                          ? formatDateTime(trip.to)
                                          : "—"}
                                      </div>
                                      <div>
                                        <span className="text-text-muted">
                                          المدة:{" "}
                                        </span>
                                        {trip.duration ?? "—"}
                                      </div>
                                      <div>
                                        <span className="text-text-muted">
                                          الحد الأقصى للضيوف:{" "}
                                        </span>
                                        {trip.max_guests ?? "—"}
                                      </div>
                                      <div>
                                        <span className="text-text-muted">
                                          قابل للاسترداد:{" "}
                                        </span>
                                        {trip.refundable ? "نعم" : "لا"}
                                      </div>
                                      <div className="sm:col-span-2 whitespace-pre">
                                        <span className="text-text-muted">
                                          الوصف:{" "}
                                        </span>
                                        {localizedText(trip.description)}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {booking.supplier && (
                                  <div className="sm:col-span-2 lg:col-span-3 border-t border-border/60 pt-3 mt-1">
                                    <div className="text-text-muted text-xs mb-1">
                                      المورد
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <span className="text-text-muted">
                                          الاسم:{" "}
                                        </span>
                                        {supplierDisplayName(booking.supplier)}
                                      </div>
                                      <div>
                                        <span className="text-text-muted">
                                          التقييم:{" "}
                                        </span>
                                        {booking.supplier.rate ?? "—"}
                                      </div>
                                      <div className="sm:col-span-2">
                                        <span className="text-text-muted">
                                          نبذة:{" "}
                                        </span>
                                        {localizedText(
                                          booking.supplier.about,
                                          300,
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
