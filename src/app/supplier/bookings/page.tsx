"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import PageHeader from "@/components/shared/page-header"
import { ErrorDisplay } from "@/components/shared/error-display"
import { BookingListSkeleton } from "@/components/shared/loading-skeletons"
import { BookingStatsRow } from "@/components/shared/bookings/booking-toolbar"
import { BookingToolbar } from "@/components/shared/bookings/booking-toolbar"
import { BookingList } from "@/components/shared/bookings/booking-list"
import { SupplierManualPaymentActions } from "@/components/shared/bookings/supplier-manual-payment-actions"
import { useBookingQueryState } from "@/components/shared/bookings/use-booking-query-state"
import {
  BOOKINGS_PAGE_SIZE,
  filterBookings,
  paginateBookings,
  sortBookings,
} from "@/lib/booking-utils"
import { getBookingStatusLabel } from "@/lib/constants"
import * as bookingsApi from "@/lib/api/bookings"
import {
  confirmManualPayment,
  refundManualPayment,
} from "@/lib/api/bookings"
import * as tripsApi from "@/lib/api/trips"
import * as tourGuidesApi from "@/lib/api/tour-guides"
import type { Booking, BookingStatus, TourGuide } from "@/lib/types"
import { useToast } from "@/lib/stores/toast-store"

function SupplierBookingsContent() {
  const { addToast } = useToast()
  const { state, setState, resetFilters } = useBookingQueryState()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [tourGuides, setTourGuides] = useState<TourGuide[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guidesWarning, setGuidesWarning] = useState<string | null>(null)
  const [guideUpdating, setGuideUpdating] = useState<number | null>(null)
  const [manualActionLoading, setManualActionLoading] = useState<number | null>(
    null,
  )

  const fetchBookings = useCallback(async (refreshOnly = false) => {
    if (refreshOnly) setIsRefreshing(true)
    else setIsLoading(true)
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
    if (guidesRes.error) {
      setGuidesWarning(
        "تعذّر تحميل قائمة المرشدين. يمكنك متابعة الحجوزات، لكن تعيين المرشد غير متاح مؤقتاً.",
      )
    } else {
      setGuidesWarning(null)
    }

    setIsLoading(false)
    setIsRefreshing(false)
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetchBookings()
    }, 0)
    return () => window.clearTimeout(id)
  }, [fetchBookings])

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
    await fetchBookings(true)
  }

  const handleManualConfirm = async (id: number) => {
    setManualActionLoading(id)
    const { error: err } = await confirmManualPayment(id)
    setManualActionLoading(null)
    if (err) {
      addToast(err, "error")
      return
    }
    addToast("تم تأكيد استلام الدفع", "success")
    await fetchBookings(true)
  }

  const handleManualRefund = async (id: number) => {
    setManualActionLoading(id)
    const { error: err } = await refundManualPayment(id)
    setManualActionLoading(null)
    if (err) {
      addToast(err, "error")
      return
    }
    addToast("تم استرداد الدفع", "success")
    await fetchBookings(true)
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
      ? "ستظهر حجوزات رحلاتك هنا فور إنشائها."
      : "جرّب تعديل البحث أو إعادة ضبط عوامل التصفية."

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="الحجوزات"
          description="متابعة حجوزات رحلاتك وإدارة الدفع اليدوي"
        />
        <BookingListSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="الحجوزات" />
        <ErrorDisplay error={error} onRetry={() => void fetchBookings()} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحجوزات"
        description="متابعة حجوزات رحلاتك وإدارة الدفع اليدوي"
      />

      <BookingStatsRow
        bookings={bookings}
        showRefundPending
        activeStatusFilter={state.status}
        onStatusFilter={(status) => setState({ status }, true)}
      />

      <BookingToolbar
        state={state}
        resultCount={filteredBookings.length}
        totalCount={bookings.length}
        onChange={setState}
        onReset={resetFilters}
        onRefresh={() => void fetchBookings(true)}
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
        tourGuides={tourGuides}
        expandedId={state.expanded}
        onToggleExpanded={toggleExpanded}
        variant="supplier"
        guideUpdating={guideUpdating}
        onGuideChange={handleGuideChange}
        renderSupplierActions={(booking) => (
          <SupplierManualPaymentActions
            booking={booking}
            loadingId={manualActionLoading}
            onConfirm={handleManualConfirm}
            onRefund={handleManualRefund}
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
    </div>
  )
}

export default function SupplierBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader title="الحجوزات" />
          <BookingListSkeleton />
        </div>
      }
    >
      <SupplierBookingsContent />
    </Suspense>
  )
}
