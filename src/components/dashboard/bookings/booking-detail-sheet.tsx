"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import StatusBadge from "@/components/shared/status-badge"
import { TripTypeBadge } from "@/components/shared/trip-type-badge"
import { PaymentMethodBadge } from "@/components/shared/payment-method-badge"
import { DetailField } from "@/components/dashboard/detail-field"
import { BookingActions, hasBookingActions, type BookingActionType } from "./booking-actions"
import { bookingStrings } from "./booking-strings"
import {
  canAdminCancelBooking,
  localizedText,
  localizedTripName,
  resourceLabels,
  supplierDisplayName,
} from "@/lib/bookings/status"
import { formatCurrency, formatDateTime } from "@/lib/constants"
import type { Booking, Supplier, TourGuide, Trip } from "@/lib/types"
import { ChevronDown } from "lucide-react"

interface BookingDetailSheetProps {
  booking: Booking | null
  open: boolean
  onOpenChange: (open: boolean) => void
  role: "admin" | "supplier"
  trip?: Trip
  supplier?: Supplier
  tourGuides?: TourGuide[]
  guideUpdating?: string | null
  loadingAction?: string | null
  onGuideChange?: (tripId: string, guideId: string) => void
  onAction: (type: BookingActionType, booking: Booking, note?: string) => void
}

export function BookingDetailSheet({
  booking,
  open,
  onOpenChange,
  role,
  trip,
  supplier,
  tourGuides = [],
  guideUpdating,
  loadingAction,
  onGuideChange,
  onAction,
}: BookingDetailSheetProps) {
  if (!booking) return null

  const resolvedTrip = trip ?? booking.trip
  const resolvedSupplier = supplier ?? booking.supplier
  const showFooterActions = hasBookingActions(booking, role)
  const rt = booking.resource_type
    ? (resourceLabels[booking.resource_type] ?? booking.resource_type)
    : "—"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-lg p-0 flex flex-col" closeLabel="إغلاق">
        <SheetHeader className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between flex-wrap gap-3 pe-8">
            <div>
              <SheetTitle className="text-lg">
                #{booking.ID}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {booking.full_name}
              </SheetDescription>
            </div>
            <StatusBadge status={booking.status} type="booking" />
          </div>
          <p className="text-xl font-bold text-duck-navy mt-2">
            {formatCurrency(booking.amount, booking.currency)}
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-4">
            {/* Customer */}
            <section>
              <h3 className="text-sm font-semibold text-duck-navy mb-3">
                {bookingStrings.customer}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField label={bookingStrings.customer} value={booking.full_name} />
                <DetailField
                  label={bookingStrings.phone}
                  value={booking.phone_number || "—"}
                  mono
                  dir="ltr"
                  copyable
                />
                {booking.user && (
                  <DetailField
                    label={bookingStrings.customerAccount}
                    value={`${[booking.user.first_name, booking.user.last_name].filter(Boolean).join(" ")}${booking.user.email ? ` · ${booking.user.email}` : ""}`}
                    className="sm:col-span-2"
                  />
                )}
              </div>
            </section>

            <Separator />

            {/* Booking */}
            <section>
              <h3 className="text-sm font-semibold text-duck-navy mb-3">
                {bookingStrings.bookingDetails}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField
                  label={bookingStrings.trip}
                  value={
                    <span className="flex items-center gap-2 flex-wrap">
                      {localizedTripName(resolvedTrip)}
                      <TripTypeBadge isTour={resolvedTrip?.is_tour} />
                    </span>
                  }
                />
                {role === "admin" && (
                  <DetailField
                    label={bookingStrings.supplier}
                    value={supplierDisplayName(resolvedSupplier)}
                  />
                )}
                <DetailField
                  label={bookingStrings.bookingDate}
                  value={
                    booking.booking_date
                      ? formatDateTime(booking.booking_date)
                      : "—"
                  }
                />
                <DetailField label={bookingStrings.equipment} value={rt} />
                <DetailField
                  label={bookingStrings.quantity}
                  value={String(booking.quantity ?? "—")}
                />
                <DetailField
                  label={bookingStrings.guests}
                  value={
                    booking.local_guests != null || booking.foreigner_guests != null
                      ? `${booking.local_guests ?? 0} محلي · ${booking.foreigner_guests ?? 0} أجنبي`
                      : "—"
                  }
                />
                <DetailField
                  label={bookingStrings.wantsGuide}
                  value={
                    booking.wants_guide === undefined
                      ? "—"
                      : booking.wants_guide
                        ? bookingStrings.yes
                        : bookingStrings.no
                  }
                />
                <div className="sm:col-span-2">
                  <div className="text-xs text-text-muted mb-1">
                    {bookingStrings.guide}
                  </div>
                  {resolvedTrip?.is_tour && onGuideChange ? (
                    <Select
                      value={resolvedTrip.tour_guide_id?.toString() || "none"}
                      onValueChange={(v) =>
                        onGuideChange(booking.trip_id, v)
                      }
                      disabled={guideUpdating === booking.trip_id}
                    >
                      <SelectTrigger className="w-full max-w-xs h-9">
                        <SelectValue placeholder={bookingStrings.selectGuide} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          {bookingStrings.noGuide}
                        </SelectItem>
                        {tourGuides.map((g) => (
                          <SelectItem key={g.ID} value={g.ID.toString()}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm">—</span>
                  )}
                </div>
              </div>
            </section>

            <Separator />

            {/* Payment */}
            <section>
              <h3 className="text-sm font-semibold text-duck-navy mb-3">
                {bookingStrings.paymentDetails}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField
                  label={bookingStrings.payment}
                  value={<PaymentMethodBadge method={booking.payment_method} />}
                />
                <DetailField
                  label={bookingStrings.createdAt}
                  value={
                    booking.created_at
                      ? formatDateTime(booking.created_at)
                      : booking.UpdatedAt
                        ? formatDateTime(booking.UpdatedAt)
                        : "—"
                  }
                />
              </div>
            </section>

            {resolvedTrip && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-semibold text-duck-navy mb-3">
                    {bookingStrings.tripDetails}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <DetailField
                      label="من"
                      value={
                        resolvedTrip.from
                          ? formatDateTime(resolvedTrip.from)
                          : "—"
                      }
                    />
                    <DetailField
                      label="إلى"
                      value={
                        resolvedTrip.to
                          ? formatDateTime(resolvedTrip.to)
                          : "—"
                      }
                    />
                    <DetailField
                      label="المدة"
                      value={String(resolvedTrip.duration ?? "—")}
                    />
                    <DetailField
                      label="الحد الأقصى للضيوف"
                      value={String(resolvedTrip.max_guests ?? "—")}
                    />
                    <DetailField
                      label="قابل للاسترداد"
                      value={resolvedTrip.refundable ? bookingStrings.yes : bookingStrings.no}
                    />
                    <DetailField
                      label="الوصف"
                      value={localizedText(resolvedTrip.description)}
                      className="sm:col-span-2"
                    />
                  </div>
                </section>
              </>
            )}

            {role === "admin" && canAdminCancelBooking(booking.status) && (
              <p className="text-xs text-text-muted">
                {bookingStrings.adminCancelHint}
              </p>
            )}

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                >
                  {bookingStrings.technicalDetails}
                  <ChevronDown className="size-4 transition-transform [[data-state=open]_&]:rotate-180" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-1 gap-3">
                  <DetailField
                    label={bookingStrings.sessionId}
                    value={booking.session_id || "—"}
                    mono
                    copyable
                  />
                  <DetailField
                    label={bookingStrings.orderRef}
                    value={
                      [booking.order_id, booking.order_ref]
                        .filter(Boolean)
                        .join(" · ") || "—"
                    }
                    mono
                    copyable
                  />
                  <DetailField
                    label={bookingStrings.userId}
                    value={booking.user_id ?? "—"}
                    mono
                    copyable
                  />
                  <DetailField
                    label={bookingStrings.tripId}
                    value={booking.trip_id}
                    mono
                    copyable
                  />
                  <DetailField
                    label={bookingStrings.supplierId}
                    value={booking.supplier_id ?? "—"}
                    mono
                    copyable
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        {showFooterActions ? (
          <SheetFooter className="p-4 border-t shrink-0">
            <BookingActions
              booking={booking}
              role={role}
              variant="footer"
              loadingAction={loadingAction}
              onAction={onAction}
            />
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
