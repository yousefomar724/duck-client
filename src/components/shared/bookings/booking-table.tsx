"use client"

import { Fragment } from "react"
import StatusBadge from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDateTime } from "@/lib/constants"
import { bookingRowId } from "@/lib/booking-utils"
import type { Booking, BookingStatus, Supplier, TourGuide, Trip } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import { BookingPaymentBadge } from "./booking-payment-badge"
import { BookingExpandedDetails } from "./booking-expanded-details"
import { getTripNameForBooking } from "@/lib/booking-utils"

const TABLE_COL_COUNT = 8

interface BookingTableProps {
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

export function BookingTable({
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
}: BookingTableProps) {
  const resolveTrip = (booking: Booking) =>
    trips.find((t) => t.id === booking.trip_id) ?? booking.trip

  const resolveSupplier = (booking: Booking) =>
    suppliers.find((s) => s.id === booking.supplier_id) ?? booking.supplier

  return (
    <div className="hidden md:block">
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-10 p-2 text-right" aria-hidden />
            <TableHead className="text-right">رقم الحجز</TableHead>
            <TableHead className="text-right">العميل</TableHead>
            <TableHead className="text-right">الرحلة</TableHead>
            <TableHead className="text-right">الموعد</TableHead>
            <TableHead className="text-right">الدفع</TableHead>
            <TableHead className="text-right">المبلغ</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => {
            const rowId = bookingRowId(booking)
            const trip = resolveTrip(booking)
            const supplier = resolveSupplier(booking)
            const isExpanded = expandedId === rowId

            return (
              <Fragment key={`${rowId}-${booking.trip_id}-${booking.session_id}`}>
                <TableRow
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-duck-cyan/5",
                    isExpanded && "bg-duck-cyan/10",
                  )}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  aria-label={`تفاصيل الحجز رقم ${rowId}`}
                  onClick={() => onToggleExpanded(rowId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onToggleExpanded(rowId)
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
                  <TableCell className="dashboard-data-cell font-medium">
                    #{rowId}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate">
                    {booking.full_name}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate">
                    {getTripNameForBooking(booking, trip)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-text-muted">
                    {booking.booking_date
                      ? formatDateTime(booking.booking_date)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <BookingPaymentBadge paymentMethod={booking.payment_method} />
                  </TableCell>
                  <TableCell className="dashboard-data-cell font-semibold whitespace-nowrap text-duck-navy">
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
                    <TableCell colSpan={TABLE_COL_COUNT} className="border-t-0 p-0">
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
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
