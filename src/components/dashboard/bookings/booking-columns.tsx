"use client"

import { type ColumnDef } from "@tanstack/react-table"
import StatusBadge from "@/components/shared/status-badge"
import { TripTypeBadge } from "@/components/shared/trip-type-badge"
import { PaymentMethodBadge } from "@/components/shared/payment-method-badge"
import { PaymentStateBadge } from "@/components/shared/payment-state-badge"
import { DataTableColumnHeader } from "@/components/dashboard/data-table-column-header"
import { BookingActions } from "./booking-actions"
import { bookingStrings } from "./booking-strings"
import {
  localizedTripName,
  needsAction,
  supplierDisplayName,
} from "@/lib/bookings/status"
import { amountPaid, outstandingBalance, paymentState } from "@/lib/bookings/payment"
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

interface BookingColumnsOptions {
  role: "admin" | "supplier"
  trips: Trip[]
  suppliers: Supplier[]
  loadingAction?: string | null
  hideSupplier?: boolean
  onAction: (type: BookingActionType, booking: Booking, note?: string) => void
  onEdit?: (booking: Booking) => void
}

export function getBookingColumns({
  role,
  trips,
  suppliers,
  loadingAction,
  hideSupplier = false,
  onAction,
  onEdit,
}: BookingColumnsOptions): ColumnDef<Booking>[] {
  const tripMap = new Map(trips.map((t) => [t.id, t]))
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]))

  const cols: ColumnDef<Booking>[] = [
    {
      id: "customer",
      accessorFn: (row) => row.full_name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={bookingStrings.customer} />
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.full_name}</div>
          <div className="text-xs text-text-muted font-mono" dir="ltr">
            {row.original.phone_number}
          </div>
        </div>
      ),
    },
    {
      id: "trip",
      accessorFn: (row) => {
        const trip = row.trip ?? tripMap.get(row.trip_id)
        return localizedTripName(trip)
      },
      header: bookingStrings.trip,
      cell: ({ row }) => {
        const trip = row.original.trip ?? tripMap.get(row.original.trip_id)
        return (
          <div className="flex items-center gap-2 flex-wrap max-w-[200px]">
            <span className="truncate">{localizedTripName(trip)}</span>
            <TripTypeBadge isTour={trip?.is_tour} />
          </div>
        )
      },
    },
    {
      id: "booking_date",
      accessorFn: (row) => row.booking_date ?? "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={bookingStrings.bookingDate} />
      ),
      cell: ({ row }) => {
        const date = row.original.booking_date
        if (!date) return "—"
        const trip = row.original.trip ?? tripMap.get(row.original.trip_id)
        const duration = formatTripDuration(trip)
        const guests = formatGuestsCount(row.original.quantity)
        return (
          <div>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span>{formatDateShort(date)}</span>
              <span className="text-text-muted">{formatTimeShort(date)}</span>
            </div>
            <div className="text-xs text-text-muted">
              {formatRelativeTime(date)}
              {duration && ` · ${duration}`}
              {guests && ` · ${guests}`}
            </div>
          </div>
        )
      },
    },
    {
      id: "guests",
      accessorFn: (row) => row.quantity ?? 0,
      header: bookingStrings.guests,
      cell: ({ row }) => {
        const { kids } = guestAgeBreakdown(row.original)
        return (
          <span>
            {row.original.quantity ?? "—"}
            {kids > 0 ? ` · ${kids} طفل` : ""}
          </span>
        )
      },
    },
    {
      id: "amount",
      accessorFn: (row) => row.amount,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={bookingStrings.amount} />
      ),
      cell: ({ row }) => {
        const booking = row.original
        const paid = amountPaid(booking)
        const remaining = outstandingBalance(booking)
        return (
          <div>
            <span className="font-semibold text-duck-navy whitespace-nowrap">
              {formatCurrency(booking.amount, booking.currency)}
            </span>
            {paid > 0 && (
              <div className="text-xs text-text-muted whitespace-nowrap">
                مدفوع {formatCurrency(paid, booking.currency)}
                {remaining > 0 && (
                  <>
                    {" · "}
                    <span className="text-amber-700 font-medium">
                      متبقي {formatCurrency(remaining, booking.currency)}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )
      },
    },
    {
      id: "remaining",
      accessorFn: (row) => outstandingBalance(row),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={bookingStrings.remaining} />
      ),
      cell: ({ row }) => {
        const remaining = outstandingBalance(row.original)
        if (remaining <= 0) return <span className="text-text-muted">—</span>
        return (
          <span className="font-medium text-amber-700 whitespace-nowrap">
            {formatCurrency(remaining, row.original.currency)}
          </span>
        )
      },
    },
    {
      id: "payment_method",
      accessorFn: (row) => row.payment_method ?? "",
      header: bookingStrings.payment,
      cell: ({ row }) => (
        <PaymentMethodBadge method={row.original.payment_method} />
      ),
    },
    {
      id: "payment_state",
      accessorFn: (row) => paymentState(row),
      header: bookingStrings.paymentState,
      cell: ({ row }) => <PaymentStateBadge booking={row.original} />,
    },
    {
      id: "status",
      accessorKey: "status",
      header: bookingStrings.status,
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status}
          type="booking"
          short
          bookingDate={row.original.booking_date}
        />
      ),
    },
  ]

  if (role === "admin" && !hideSupplier) {
    cols.splice(2, 0, {
      id: "supplier",
      accessorFn: (row) => {
        const supplier =
          row.supplier ?? supplierMap.get(row.supplier_id)
        return supplierDisplayName(supplier)
      },
      header: bookingStrings.supplier,
      cell: ({ row }) => {
        const supplier =
          row.original.supplier ?? supplierMap.get(row.original.supplier_id)
        return supplierDisplayName(supplier)
      },
    })
  }

  cols.push({
    id: "actions",
    header: bookingStrings.actions,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => (
      <BookingActions
        booking={row.original}
        role={role}
        variant="dropdown"
        loadingAction={loadingAction}
        onAction={onAction}
        onEdit={onEdit}
      />
    ),
  })

  return cols
}

export function getBookingRowClassName(booking: Booking): string {
  return cn(
    needsAction(booking) && "border-s-4 border-s-amber-400",
  )
}
