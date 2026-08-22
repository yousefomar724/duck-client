"use client"

import { Card, CardContent } from "@/components/ui/card"
import StatusBadge from "@/components/shared/status-badge"
import { TripTypeBadge } from "@/components/shared/trip-type-badge"
import { PaymentMethodBadge } from "@/components/shared/payment-method-badge"
import { BookingActions } from "./booking-actions"
import { bookingStrings } from "./booking-strings"
import {
  bookingRowId,
  localizedTripName,
  needsAction,
  supplierDisplayName,
} from "@/lib/bookings/status"
import { outstandingBalance } from "@/lib/bookings/payment"
import { guestAgeBreakdown } from "@/lib/bookings/guests"
import {
  formatCurrency,
  formatDateShort,
  formatTripDuration,
  formatGuestsCount,
  formatRelativeTime,
  formatTimeShort,
} from "@/lib/constants"
import type { Booking, Supplier, Trip } from "@/lib/types"
import type { BookingActionType } from "./booking-actions"
import { cn } from "@/lib/utils"
import { Calendar, ChevronLeft, Clock, User, Users } from "lucide-react"

interface BookingCardListProps {
  bookings: Booking[]
  role: "admin" | "supplier"
  trips: Trip[]
  suppliers: Supplier[]
  loadingAction?: string | null
  onAction: (
    type: BookingActionType,
    booking: Booking,
    note?: string,
    amount?: number,
  ) => void
  onEdit?: (booking: Booking) => void
  onViewDetails: (booking: Booking) => void
}

export function BookingCardList({
  bookings,
  role,
  trips,
  suppliers,
  loadingAction,
  onAction,
  onEdit,
  onViewDetails,
}: BookingCardListProps) {
  const tripMap = new Map(trips.map((t) => [t.id, t]))
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]))

  return (
    <div className="space-y-3 md:hidden">
      {bookings.map((booking) => {
        const trip = booking.trip ?? tripMap.get(booking.trip_id)
        const supplier =
          booking.supplier ?? supplierMap.get(booking.supplier_id)

        return (
          <Card
            key={bookingRowId(booking)}
            className={cn(
              "overflow-hidden cursor-pointer hover:shadow-md transition-shadow",
              needsAction(booking) && "border-s-4 border-s-amber-400",
            )}
            onClick={() => onViewDetails(booking)}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-text-dark flex items-center gap-1.5">
                  <User className="size-3.5 text-text-muted" />
                  {booking.full_name}
                </p>
                <StatusBadge status={booking.status} type="booking" short />
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="truncate">{localizedTripName(trip)}</span>
                <TripTypeBadge isTour={trip?.is_tour} />
              </div>

              {role === "admin" && (
                <p className="text-xs text-text-muted">
                  {bookingStrings.supplier}: {supplierDisplayName(supplier)}
                </p>
              )}

              <div className="flex items-center gap-1.5 text-sm text-text-muted">
                <Calendar className="size-3.5" />
                {booking.booking_date ? (
                  <span>
                    {formatDateShort(booking.booking_date)}{" "}
                    {formatTimeShort(booking.booking_date)}
                    <span className="text-xs ms-1">
                      ({formatRelativeTime(booking.booking_date)})
                    </span>
                  </span>
                ) : (
                  "—"
                )}
              </div>

              {(formatTripDuration(trip) ||
                formatGuestsCount(booking.quantity)) && (
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  {formatTripDuration(trip) && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatTripDuration(trip)}
                    </span>
                  )}
                  {formatGuestsCount(booking.quantity) && (
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {formatGuestsCount(booking.quantity)}
                      {guestAgeBreakdown(booking).kids > 0
                        ? ` · ${guestAgeBreakdown(booking).kids} طفل`
                        : ""}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <PaymentMethodBadge method={booking.payment_method} />
                  <span className="font-bold text-duck-navy">
                    {formatCurrency(booking.amount, booking.currency)}
                  </span>
                  {outstandingBalance(booking) > 0 && (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                      متبقي {formatCurrency(outstandingBalance(booking), booking.currency)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <div data-prevent-row-click onClick={(e) => e.stopPropagation()}>
                    <BookingActions
                      booking={booking}
                      role={role}
                      variant="dropdown"
                      loadingAction={loadingAction}
                      onAction={onAction}
                      onEdit={onEdit}
                    />
                  </div>
                  <ChevronLeft className="size-4 text-text-muted rtl:rotate-180" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
