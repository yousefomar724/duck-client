"use client"

import { type ColumnDef } from "@tanstack/react-table"
import StatusBadge from "@/components/shared/status-badge"
import { TripTypeBadge } from "@/components/shared/trip-type-badge"
import { PaymentMethodBadge } from "@/components/shared/payment-method-badge"
import { DataTableColumnHeader } from "@/components/dashboard/data-table-column-header"
import { BookingActions } from "./booking-actions"
import { bookingStrings } from "./booking-strings"
import {
  localizedTripName,
  needsAction,
  supplierDisplayName,
} from "@/lib/bookings/status"
import {
  formatCurrency,
  formatDateShort,
  formatDurationHours,
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
  onAction: (type: BookingActionType, booking: Booking, note?: string) => void
}

export function getBookingColumns({
  role,
  trips,
  suppliers,
  loadingAction,
  onAction,
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
        const duration = formatDurationHours(trip?.duration)
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
      cell: ({ row }) => row.original.quantity ?? "—",
    },
    {
      id: "amount",
      accessorFn: (row) => row.amount,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={bookingStrings.amount} />
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-duck-navy whitespace-nowrap">
          {formatCurrency(row.original.amount, row.original.currency)}
        </span>
      ),
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
      id: "status",
      accessorKey: "status",
      header: bookingStrings.status,
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} type="booking" />
      ),
    },
  ]

  if (role === "admin") {
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
