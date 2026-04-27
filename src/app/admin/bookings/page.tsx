"use client"

import { Fragment, useState, useEffect } from "react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as bookingsApi from "@/lib/api/bookings"
import * as tripsApi from "@/lib/api/trips"
import * as suppliersApi from "@/lib/api/suppliers"
import * as tourGuidesApi from "@/lib/api/tour-guides"
import { formatCurrency, formatDateTime } from "@/lib/constants"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import StatCard from "@/components/shared/stat-card"
import { CalendarCheck, CheckCircle, ChevronDown, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  BookingStatus,
  Booking,
  Trip,
  Supplier,
  TourGuide,
} from "@/lib/types"
import { useToast } from "@/lib/stores/toast-store"

const ALL_STATUSES: BookingStatus[] = [
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

const statusFilterLabels: Partial<Record<BookingStatus, string>> & {
  all: string
} = {
  all: "كل الحالات",
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكد",
  CANCELLED: "ملغي",
  FAILED: "فشل",
  SUCCESS: "نجح",
  REFUND_PENDING: "في انتظار الاسترداد",
  REFUNDED: "تم الاسترداد",
  REFUND_FAILED: "فشل الاسترداد",
  COMPLETED: "مكتمل",
  PAID: "مدفوع",
}

const resourceLabels: Record<string, string> = {
  kayak: "كاياك",
  water_cycle: "دراجة مائية",
  sup: "التجديف وقوفاً",
}

/** Chevron + 4 summary columns */
const TABLE_COL_COUNT = 5

function localizedTripName(trip?: Trip) {
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

export default function AdminBookings() {
  const { addToast } = useToast()
  const getSupplierName = (supplier?: Supplier) => {
    if (!supplier) return "-"
    return typeof supplier.name === "string"
      ? supplier.name
      : supplier.name.ar || supplier.name.en || "-"
  }

  const [bookings, setBookings] = useState<Booking[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [tourGuides, setTourGuides] = useState<TourGuide[]>([])
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refundId, setRefundId] = useState<number | null>(null)
  const [refundReason, setRefundReason] = useState("")
  const [refundLoading, setRefundLoading] = useState(false)
  const [guideUpdating, setGuideUpdating] = useState<number | null>(null)
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(
    null,
  )

  const toggleExpanded = (id: number) => {
    setExpandedBookingId((prev) => (prev === id ? null : id))
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [bookingsRes, tripsRes, suppliersRes, guidesRes] =
        await Promise.all([
          bookingsApi.getBookings(),
          tripsApi.getTrips(),
          suppliersApi.getSuppliers(),
          tourGuidesApi.getTourGuides(),
        ])

      if (bookingsRes.error || tripsRes.error || suppliersRes.error) {
        setError("فشل في تحميل البيانات")
        return
      }

      setBookings(bookingsRes.data || [])
      setTrips(tripsRes.data || [])
      setSuppliers(suppliersRes.data || [])
      setTourGuides(guidesRes.data || [])
    } catch (err) {
      setError("حدث خطأ أثناء تحميل البيانات")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredBookings = bookings.filter((booking) => {
    const matchesStatus =
      statusFilter === "all" || booking.status === statusFilter
    return matchesStatus
  })

  const totalCount = bookings.length
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length
  const pendingCount = bookings.filter((b) => b.status === "PENDING").length

  const handleGuideChange = async (tripId: number, guideId: string) => {
    setGuideUpdating(tripId)
    const payload: Record<string, unknown> = {
      tour_guide_id: guideId === "none" ? 0 : parseInt(guideId, 10),
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await tripsApi.updateTrip(tripId, payload as any)
    setGuideUpdating(null)
    if (err) {
      addToast(err, "error")
      return
    }
    addToast("تم تحديث المرشد", "success")
    await fetchData()
  }

  const processRefund = async () => {
    if (refundId == null) return
    setRefundLoading(true)
    const { error: err } = await bookingsApi.processRefund(
      refundId,
      refundReason.trim() || undefined,
    )
    setRefundLoading(false)
    setRefundId(null)
    setRefundReason("")
    if (err) {
      addToast(err, "error")
      return
    }
    addToast("تمت معالجة الاسترداد", "success")
    await fetchData()
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
        <ErrorDisplay error={error} onRetry={fetchData} />
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
        <Select
          dir="rtl"
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="تصفية حسب الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{statusFilterLabels.all}</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {statusFilterLabels[s] ?? s}
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
              : `الحجوزات - ${statusFilterLabels[statusFilter] ?? statusFilter}`}
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
                  const trip = trips.find((t) => t.id === booking.trip_id)
                  const supplier = suppliers.find(
                    (s) => s.id === booking.supplier_id,
                  )
                  const rt = booking.resource_type
                    ? (resourceLabels[booking.resource_type] ??
                      booking.resource_type)
                    : "—"
                  const isExpanded = expandedBookingId === booking.ID
                  return (
                    <Fragment key={booking.ID}>
                      <TableRow
                        className={cn(
                          "hover:bg-duck-cyan/5 transition-colors cursor-pointer",
                          isExpanded && "bg-duck-cyan/10",
                        )}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        aria-label={`تفاصيل الحجز رقم ${booking.ID}`}
                        onClick={() => toggleExpanded(booking.ID)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            toggleExpanded(booking.ID)
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
                        <TableCell className="font-medium">
                          #{booking.ID}
                        </TableCell>
                        <TableCell>{booking.full_name}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
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
                                    المورد
                                  </div>
                                  <div>{getSupplierName(supplier)}</div>
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
                                          handleGuideChange(trip.id, v)
                                        }
                                        disabled={guideUpdating === trip.id}
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
                                    تاريخ الإنشاء
                                  </div>
                                  <div>
                                    {booking.created_at
                                      ? formatDateTime(booking.created_at)
                                      : "—"}
                                  </div>
                                </div>
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
                                <div className="sm:col-span-2 lg:col-span-3 border-t border-border/60 pt-3 mt-1">
                                  <div className="text-text-muted text-xs mb-1">
                                    الرحلة
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <span className="text-text-muted">
                                        الاسم:{" "}
                                      </span>
                                      {localizedTripName(trip)}
                                    </div>
                                    <div>
                                      <span className="text-text-muted">
                                        معرف الرحلة:{" "}
                                      </span>
                                      {booking.trip_id}
                                    </div>
                                    {trip && (
                                      <>
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
                                      </>
                                    )}
                                  </div>
                                </div>
                                {supplier && (
                                  <div className="sm:col-span-2 lg:col-span-3 border-t border-border/60 pt-3 mt-1">
                                    <div className="text-text-muted text-xs mb-1">
                                      المورد
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <span className="text-text-muted">
                                          المعرف:{" "}
                                        </span>
                                        {supplier.id}
                                      </div>
                                      <div>
                                        <span className="text-text-muted">
                                          التقييم:{" "}
                                        </span>
                                        {supplier.rate ?? "—"}
                                      </div>
                                      <div className="sm:col-span-2">
                                        <span className="text-text-muted">
                                          نبذة:{" "}
                                        </span>
                                        {localizedText(supplier.about, 300)}
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

      <AlertDialog
        open={refundId != null}
        onOpenChange={(open) => {
          if (!open) {
            setRefundId(null)
            setRefundReason("")
          }
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>معالجة الاسترداد</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إرسال طلب الاسترداد إلى بوابة الدفع. يمكنك إضافة سبب اختياري.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="refund-reason">السبب (اختياري)</Label>
            <Input
              id="refund-reason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="مثال: طلب العميل"
            />
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={refundLoading}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void processRefund()
              }}
              disabled={refundLoading}
            >
              {refundLoading ? "جاري..." : "تأكيد الاسترداد"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
