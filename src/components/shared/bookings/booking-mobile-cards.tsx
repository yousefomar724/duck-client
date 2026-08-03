"use client"

import StatusBadge from "@/components/shared/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency, formatDateTime } from "@/lib/constants"
import { bookingRowId, getTripNameForBooking } from "@/lib/booking-utils"
import type { Booking, BookingStatus, Supplier, TourGuide, Trip } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import { BookingPaymentBadge } from "./booking-payment-badge"
import { BookingExpandedDetails } from "./booking-expanded-details"

interface BookingMobileCardsProps {
  bookings: Booking[]
  trips?: Trip[]
  suppliers?: Supplier[]
  tourGuides: TourGuide[]
  expandedId: number | null
  onToggleExpanded: (id: number) => void
  variant: "admin" | "supplier"
  guideUpdating?: number | null
  onGuideChange?: (tripId: number, guideId: string) => void
  renderAdminActions?: (booking: Booking) => React.ReactNode
  renderSupplierActions?: (booking: Booking) => React.ReactNode
}

export function BookingMobileCards({
  bookings,
  trips = [],
  suppliers = [],
  tourGuides,
  expandedId,
  onToggleExpanded,
  variant,
  guideUpdating,
  onGuideChange,
  renderAdminActions,
  renderSupplierActions,
}: BookingMobileCardsProps) {
  const resolveTrip = (booking: Booking) =>
    trips.find((t) => t.id === booking.trip_id) ?? booking.trip

  const resolveSupplier = (booking: Booking) =>
    suppliers.find((s) => s.id === booking.supplier_id) ?? booking.supplier

  return (
    <div className="space-y-3 md:hidden">
      {bookings.map((booking) => {
        const rowId = bookingRowId(booking)
        const trip = resolveTrip(booking)
        const supplier = resolveSupplier(booking)
        const isExpanded = expandedId === rowId

        return (
          <Card
            key={`${rowId}-${booking.trip_id}-${booking.session_id}`}
            className={cn(
              "overflow-hidden transition-shadow",
              isExpanded && "ring-2 ring-duck-cyan/30",
            )}
          >
            <button
              type="button"
              className="w-full cursor-pointer px-4 py-4 text-right dashboard-focus-ring"
              aria-expanded={isExpanded}
              aria-label={`تفاصيل الحجز رقم ${rowId}`}
              onClick={() => onToggleExpanded(rowId)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="dashboard-data-cell text-sm font-semibold text-duck-navy">
                      #{rowId}
                    </span>
                    <StatusBadge
                      status={booking.status as BookingStatus}
                      type="booking"
                    />
                  </div>
                  <p className="truncate text-base font-medium text-text-dark">
                    {booking.full_name}
                  </p>
                  <p className="truncate text-sm text-text-muted">
                    {getTripNameForBooking(booking, trip)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="dashboard-data-cell font-semibold text-duck-navy">
                      {formatCurrency(booking.amount, booking.currency)}
                    </span>
                    <BookingPaymentBadge paymentMethod={booking.payment_method} />
                  </div>
                  {booking.booking_date && (
                    <p className="text-xs text-text-muted">
                      {formatDateTime(booking.booking_date)}
                    </p>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    "mt-1 size-5 shrink-0 text-text-muted transition-transform",
                    isExpanded && "rotate-180",
                  )}
                  aria-hidden
                />
              </div>
            </button>
            {isExpanded && (
              <CardContent className="border-t p-0">
                <BookingExpandedDetails
                  booking={booking}
                  trip={trip}
                  supplier={supplier}
                  tourGuides={tourGuides}
                  variant={variant}
                  guideUpdating={guideUpdating}
                  onGuideChange={onGuideChange}
                  adminActions={renderAdminActions?.(booking)}
                  supplierActions={renderSupplierActions?.(booking)}
                />
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
