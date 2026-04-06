"use client"

import { useState, useEffect } from "react"
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
import { Button } from "@/components/ui/button"
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
import { CalendarCheck, CheckCircle, Clock } from "lucide-react"
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
        <TableSkeleton rows={5} columns={12} />
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

      <div className="flex gap-4">
        <Select
          dir="rtl"
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-[240px]">
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

      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter === "all"
              ? "جميع الحجوزات"
              : `الحجوزات - ${statusFilterLabels[statusFilter] ?? statusFilter}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 overflow-x-auto">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-muted">لا توجد حجوزات متاحة</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">رقم الحجز</TableHead>
                  <TableHead className="text-right">اسم العميل</TableHead>
                  <TableHead className="text-right">رقم الهاتف</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">المورد</TableHead>
                  <TableHead className="text-right">تاريخ الحجز</TableHead>
                  <TableHead className="text-right">المعدّات</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">المرشد</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
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
                  return (
                    <TableRow
                      key={booking.id}
                      className="hover:bg-duck-cyan/5 transition-colors"
                    >
                      <TableCell className="font-medium">
                        #{booking.id}
                      </TableCell>
                      <TableCell>{booking.full_name}</TableCell>
                      <TableCell className="text-text-muted">
                        {booking.phone_number}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                            trip?.is_tour
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {trip?.is_tour ? "جولة" : "رحلة"}
                        </span>
                      </TableCell>
                      <TableCell>{trip?.name.ar || "-"}</TableCell>
                      <TableCell>{getSupplierName(supplier)}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {booking.booking_date
                          ? formatDateTime(booking.booking_date)
                          : "—"}
                      </TableCell>
                      <TableCell>{rt}</TableCell>
                      <TableCell>{booking.quantity ?? "—"}</TableCell>
                      <TableCell>
                        {formatCurrency(booking.amount, booking.currency)}
                      </TableCell>
                      <TableCell>
                        {trip?.is_tour ? (
                          <Select
                            dir="rtl"
                            value={trip.tour_guide_id?.toString() || "none"}
                            onValueChange={(v) => handleGuideChange(trip.id, v)}
                            disabled={guideUpdating === trip.id}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue placeholder="اختر مرشد" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">بدون مرشد</SelectItem>
                              {tourGuides.map((g) => (
                                <SelectItem key={g.ID} value={g.ID.toString()}>
                                  {g.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={booking.status as BookingStatus}
                          type="booking"
                        />
                      </TableCell>
                      <TableCell className="text-text-muted whitespace-nowrap">
                        {formatDateTime(booking.created_at)}
                      </TableCell>
                      <TableCell>
                        {booking.status === "REFUND_PENDING" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-300 text-amber-900"
                            onClick={() => setRefundId(booking.id)}
                          >
                            استرداد
                          </Button>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
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
