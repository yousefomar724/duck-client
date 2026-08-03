"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import PageHeader from "@/components/shared/page-header"
import { ErrorDisplay } from "@/components/shared/error-display"
import { BookingListSkeleton } from "@/components/shared/loading-skeletons"
import { BookingStatsRow } from "@/components/shared/bookings/booking-toolbar"
import { BookingToolbar } from "@/components/shared/bookings/booking-toolbar"
import { BookingList } from "@/components/shared/bookings/booking-list"
import {
  AdminBookingDialogs,
  AdminBookingInlineActions,
} from "@/components/shared/bookings/admin-booking-actions"
import { useBookingQueryState } from "@/components/shared/bookings/use-booking-query-state"
import {
  BOOKINGS_PAGE_SIZE,
  filterBookings,
  paginateBookings,
  sortBookings,
} from "@/lib/booking-utils"
import { getBookingStatusLabel } from "@/lib/constants"
import * as bookingsApi from "@/lib/api/bookings"
import * as tripsApi from "@/lib/api/trips"
import * as suppliersApi from "@/lib/api/suppliers"
import * as tourGuidesApi from "@/lib/api/tour-guides"
import type { Booking, BookingStatus, Supplier, TourGuide, Trip } from "@/lib/types"
import { useToast } from "@/lib/stores/toast-store"

function AdminBookingsContent() {
  const { addToast } = useToast()
  const { state, setState, resetFilters } = useBookingQueryState()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [tourGuides, setTourGuides] = useState<TourGuide[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guidesWarning, setGuidesWarning] = useState<string | null>(null)

  const [refundId, setRefundId] = useState<number | null>(null)
  const [refundReason, setRefundReason] = useState("")
  const [refundLoading, setRefundLoading] = useState(false)
  const [adminCancelId, setAdminCancelId] = useState<number | null>(null)
  const [adminCancelNote, setAdminCancelNote] = useState("")
  const [adminCancelLoading, setAdminCancelLoading] = useState(false)
  const [guideUpdating, setGuideUpdating] = useState<number | null>(null)

  const fetchData = useCallback(async (refreshOnly = false) => {
    try {
      if (refreshOnly) setIsRefreshing(true)
      else setIsLoading(true)
      setError(null)

      const [bookingsRes, tripsRes, suppliersRes, guidesRes] =
        await Promise.all([
          bookingsApi.getBookings(),
          tripsApi.getTrips(),
          suppliersApi.getSuppliers(),
          tourGuidesApi.getTourGuides(),
        ])

      if (bookingsRes.error || tripsRes.error || suppliersRes.error) {
        setError(
          bookingsRes.error ||
            tripsRes.error ||
            suppliersRes.error ||
            "فشل في تحميل البيانات",
        )
        return
      }

      setBookings(bookingsRes.data || [])
      setTrips(tripsRes.data || [])
      setSuppliers(suppliersRes.data || [])
      setTourGuides(guidesRes.data || [])

      if (guidesRes.error) {
        setGuidesWarning(
          "تعذّر تحميل قائمة المرشدين. يمكنك متابعة الحجوزات، لكن تعيين المرشد غير متاح مؤقتاً.",
        )
      } else {
        setGuidesWarning(null)
      }
    } catch (err) {
      setError("حدث خطأ أثناء تحميل البيانات")
      console.error(err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetchData()
    }, 0)
    return () => window.clearTimeout(id)
  }, [fetchData])

  const filteredBookings = useMemo(() => {
    const filtered = filterBookings(bookings, {
      search: state.search,
      status: state.status,
      payment: state.payment,
    })
    return sortBookings(filtered, state.sort)
  }, [bookings, state.search, state.status, state.payment, state.sort])

  const pagination = useMemo(
    () => paginateBookings(filteredBookings, state.page, BOOKINGS_PAGE_SIZE),
    [filteredBookings, state.page],
  )

  const toggleExpanded = (id: number) => {
    setState({
      expanded: state.expanded === id ? null : id,
      page: state.page,
    })
  }

  const handleGuideChange = async (tripId: number, guideId: string) => {
    setGuideUpdating(tripId)
    const payload: Record<string, unknown> = {
      tour_guide_id: guideId === "none" ? 0 : parseInt(guideId, 10),
    }
    const { error: err } = await tripsApi.updateTrip(
      tripId,
      payload as Parameters<typeof tripsApi.updateTrip>[1],
    )
    setGuideUpdating(null)
    if (err) {
      addToast(err, "error")
      return
    }
    addToast("تم تحديث المرشد", "success")
    await fetchData(true)
  }

  const processRefund = async () => {
    if (refundId == null) return
    setRefundLoading(true)
    const { data, error: err } = await bookingsApi.processRefund(
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
    if (data?.booking_status === "REFUNDED") {
      addToast("تمت معالجة الاسترداد بنجاح", "success")
    } else if (data?.booking_status === "REFUND_FAILED") {
      addToast(
        "فشلت عملية الاسترداد عبر الدفع. راجع حالة الحجز أو حاول لاحقاً.",
        "error",
      )
    } else {
      addToast("تم إرسال طلب الاسترداد", "success")
    }
    await fetchData(true)
  }

  const confirmAdminCancel = async () => {
    if (adminCancelId == null) return
    setAdminCancelLoading(true)
    const { error: err } = await bookingsApi.adminCancelBooking(
      adminCancelId,
      adminCancelNote.trim() || undefined,
    )
    setAdminCancelLoading(false)
    setAdminCancelId(null)
    setAdminCancelNote("")
    if (err) {
      addToast(err, "error")
      return
    }
    addToast(
      "تم وضع الحجز في انتظار الاسترداد. يمكنك معالجة الاسترداد لاحقاً.",
      "success",
    )
    await fetchData(true)
  }

  const listTitle =
    state.status === "all"
      ? "جميع الحجوزات"
      : state.status === "active"
        ? "الحجوزات — نشط / مدفوع"
        : `الحجوزات — ${getBookingStatusLabel(state.status as BookingStatus)}`

  const emptyTitle =
    bookings.length === 0
      ? "لا توجد حجوزات بعد"
      : "لا توجد نتائج مطابقة"

  const emptyDescription =
    bookings.length === 0
      ? "ستظهر الحجوزات الجديدة هنا فور إنشائها."
      : "جرّب تعديل البحث أو إعادة ضبط عوامل التصفية."

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="الحجوزات"
          description="إدارة ومتابعة جميع حجوزات المنصة"
        />
        <BookingListSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="الحجوزات" />
        <ErrorDisplay error={error} onRetry={() => void fetchData()} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحجوزات"
        description="إدارة ومتابعة جميع حجوزات المنصة"
      />

      <BookingStatsRow
        bookings={bookings}
        activeStatusFilter={state.status}
        onStatusFilter={(status) => setState({ status }, true)}
      />

      <BookingToolbar
        state={state}
        resultCount={filteredBookings.length}
        totalCount={bookings.length}
        onChange={setState}
        onReset={resetFilters}
        onRefresh={() => void fetchData(true)}
        isRefreshing={isRefreshing}
      />

      {guidesWarning && (
        <ErrorDisplay
          error={guidesWarning}
          showRetry={false}
          title="تنبيه"
          className="border-amber-200 bg-amber-50 [&_h3]:text-amber-900 [&_p]:text-amber-800"
        />
      )}

      <BookingList
        bookings={pagination.items}
        trips={trips}
        suppliers={suppliers}
        tourGuides={tourGuides}
        expandedId={state.expanded}
        onToggleExpanded={toggleExpanded}
        variant="admin"
        guideUpdating={guideUpdating}
        onGuideChange={handleGuideChange}
        renderAdminActions={(booking) => (
          <AdminBookingInlineActions
            booking={booking}
            onCancel={setAdminCancelId}
            onRefund={setRefundId}
          />
        )}
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        onPageChange={(page) => setState({ page })}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        cardTitle={listTitle}
      />

      <AdminBookingDialogs
        adminCancelId={adminCancelId}
        adminCancelNote={adminCancelNote}
        adminCancelLoading={adminCancelLoading}
        onAdminCancelNoteChange={setAdminCancelNote}
        onAdminCancelOpenChange={(open) => {
          if (!open) {
            setAdminCancelId(null)
            setAdminCancelNote("")
          }
        }}
        onConfirmAdminCancel={confirmAdminCancel}
        refundId={refundId}
        refundReason={refundReason}
        refundLoading={refundLoading}
        onRefundReasonChange={setRefundReason}
        onRefundOpenChange={(open) => {
          if (!open) {
            setRefundId(null)
            setRefundReason("")
          }
        }}
        onConfirmRefund={processRefund}
      />
    </div>
  )
}

export default function AdminBookings() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader title="الحجوزات" />
          <BookingListSkeleton />
        </div>
      }
    >
      <AdminBookingsContent />
    </Suspense>
  )
}
