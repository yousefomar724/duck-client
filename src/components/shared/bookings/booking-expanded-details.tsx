"use client"

import StatusBadge from "@/components/shared/status-badge"
import { formatCurrency, formatDateTime } from "@/lib/constants"
import {
  bookingRowId,
  canAdminCancelBooking,
  getBookingCreatedAt,
  getResourceLabel,
  getSupplierName,
  getTripNameForBooking,
  localizedText,
  localizedTripName,
} from "@/lib/booking-utils"
import type { Booking, BookingStatus, Supplier, TourGuide, Trip } from "@/lib/types"
import { cn } from "@/lib/utils"
import { BookingPaymentBadge } from "./booking-payment-badge"
import { DetailField, DetailSection } from "./booking-detail-fields"
import { TourGuideSelect } from "./tour-guide-select"

export interface BookingExpandedDetailsProps {
  booking: Booking
  trip?: Trip
  supplier?: Supplier
  tourGuides: TourGuide[]
  variant: "admin" | "supplier"
  guideUpdating?: number | null
  onGuideChange?: (tripId: number, guideId: string) => void
  adminActions?: React.ReactNode
  supplierActions?: React.ReactNode
}

export function BookingExpandedDetails({
  booking,
  trip,
  supplier,
  tourGuides,
  variant,
  guideUpdating,
  onGuideChange,
  adminActions,
  supplierActions,
}: BookingExpandedDetailsProps) {
  const rowId = bookingRowId(booking)
  const rt = getResourceLabel(booking.resource_type)
  const resolvedTrip = trip ?? booking.trip
  const resolvedSupplier = supplier ?? booking.supplier

  return (
    <div className="border-t border-border bg-muted/20 px-3 py-4 sm:px-5" dir="rtl">
      <DetailSection title="العميل والحجز" actions={variant === "admin" ? adminActions : undefined}>
        <DetailField label="رقم الحجز" mono>
          #{rowId}
        </DetailField>
        <DetailField label="اسم العميل">{booking.full_name}</DetailField>
        <DetailField label="رقم الهاتف" mono>
          {booking.phone_number || "—"}
        </DetailField>
        <DetailField label="تاريخ الحجز">
          {booking.booking_date ? formatDateTime(booking.booking_date) : "—"}
        </DetailField>
        <DetailField label="المبلغ">
          <span className="dashboard-data-cell font-semibold text-duck-navy">
            {formatCurrency(booking.amount, booking.currency)}
          </span>
        </DetailField>
        <DetailField label="الحالة">
          <StatusBadge status={booking.status as BookingStatus} type="booking" />
        </DetailField>
      </DetailSection>

      <div className="mt-6">
        <DetailSection title="الرحلة والضيوف">
          <DetailField label="اسم الرحلة">
            {getTripNameForBooking(booking, resolvedTrip)}
          </DetailField>
          <DetailField label="النوع">
            <span
              className={cn(
                "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                resolvedTrip?.is_tour
                  ? "bg-purple-100 text-purple-700"
                  : "bg-blue-100 text-blue-700",
              )}
            >
              {resolvedTrip?.is_tour ? "جولة" : "رحلة"}
            </span>
          </DetailField>
          <DetailField label="المعدّات">{rt}</DetailField>
          <DetailField label="الكمية">{booking.quantity ?? "—"}</DetailField>
          {(booking.local_guests != null || booking.foreigner_guests != null) && (
            <>
              <DetailField label="ضيوف محليون">
                {booking.local_guests ?? "—"}
              </DetailField>
              <DetailField label="ضيوف أجانب">
                {booking.foreigner_guests ?? "—"}
              </DetailField>
            </>
          )}
          {variant === "admin" && (
            <DetailField label="المورد">
              {getSupplierName(resolvedSupplier)}
            </DetailField>
          )}
          <DetailField
            label="المرشد"
            className="sm:col-span-2 lg:col-span-1"
          >
            {resolvedTrip?.is_tour && onGuideChange ? (
              <div
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <TourGuideSelect
                  value={resolvedTrip.tour_guide_id}
                  guides={tourGuides}
                  disabled={guideUpdating === resolvedTrip.id}
                  onChange={(v) => onGuideChange(resolvedTrip.id, v)}
                />
              </div>
            ) : (
              "—"
            )}
          </DetailField>
        </DetailSection>
      </div>

      <div className="mt-6">
        <DetailSection title="الدفع والمراجع">
          <DetailField label="طريقة الدفع">
            <BookingPaymentBadge paymentMethod={booking.payment_method} />
          </DetailField>
          <DetailField label="تاريخ الإنشاء">
            {getBookingCreatedAt(booking)
              ? formatDateTime(getBookingCreatedAt(booking)!)
              : "—"}
          </DetailField>
          <DetailField label="معرف الجلسة" mono>
            {booking.session_id || "—"}
          </DetailField>
          <DetailField label="رقم الطلب / المرجع" mono>
            {[booking.order_id, booking.order_ref].filter(Boolean).join(" · ") ||
              "—"}
          </DetailField>
          <DetailField label="معرف المستخدم" mono>
            {booking.user_id ?? "—"}
          </DetailField>
          <DetailField label="طلب مرشد">
            {booking.wants_guide === undefined
              ? "—"
              : booking.wants_guide
                ? "نعم"
                : "لا"}
          </DetailField>
          {booking.user && (
            <DetailField label="حساب العميل" className="sm:col-span-2">
              {[booking.user.first_name, booking.user.last_name]
                .filter(Boolean)
                .join(" ")}
              {booking.user.email ? ` · ${booking.user.email}` : ""}
            </DetailField>
          )}
        </DetailSection>
      </div>

      {resolvedTrip && (
        <div className="mt-6 rounded-lg border border-border/60 bg-background/60 p-4">
          <p className="mb-3 text-xs font-semibold text-text-muted">تفاصيل الرحلة</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className="text-text-muted">الاسم: </span>
              {localizedTripName(resolvedTrip)}
            </div>
            <div>
              <span className="text-text-muted">معرف الرحلة: </span>
              {booking.trip_id}
            </div>
            <div>
              <span className="text-text-muted">من: </span>
              {resolvedTrip.from ? formatDateTime(resolvedTrip.from) : "—"}
            </div>
            <div>
              <span className="text-text-muted">إلى: </span>
              {resolvedTrip.to ? formatDateTime(resolvedTrip.to) : "—"}
            </div>
            <div>
              <span className="text-text-muted">المدة: </span>
              {resolvedTrip.duration ?? "—"}
            </div>
            <div>
              <span className="text-text-muted">الحد الأقصى للضيوف: </span>
              {resolvedTrip.max_guests ?? "—"}
            </div>
            <div>
              <span className="text-text-muted">قابل للاسترداد: </span>
              {resolvedTrip.refundable ? "نعم" : "لا"}
            </div>
            <div className="sm:col-span-2 whitespace-pre-wrap">
              <span className="text-text-muted">الوصف: </span>
              {localizedText(resolvedTrip.description)}
            </div>
          </div>
        </div>
      )}

      {variant === "admin" && resolvedSupplier && (
        <div className="mt-4 rounded-lg border border-border/60 bg-background/60 p-4">
          <p className="mb-3 text-xs font-semibold text-text-muted">المورد</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className="text-text-muted">المعرف: </span>
              {resolvedSupplier.id}
            </div>
            <div>
              <span className="text-text-muted">التقييم: </span>
              {resolvedSupplier.rate ?? "—"}
            </div>
            <div className="sm:col-span-2">
              <span className="text-text-muted">نبذة: </span>
              {localizedText(resolvedSupplier.about, 300)}
            </div>
          </div>
        </div>
      )}

      {variant === "admin" && canAdminCancelBooking(booking.status) && (
        <p className="mt-4 text-xs text-text-muted">
          لضيوف بدون حساب أو إلغاء تشغيلي: ألغِ من الإدارة ليصبح الحجز «في انتظار
          الاسترداد»، ثم نفّذ الاسترداد.
        </p>
      )}

      {variant === "supplier" && supplierActions && (
        <div
          className="mt-6 border-t border-border/60 pt-4"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {supplierActions}
        </div>
      )}
    </div>
  )
}
