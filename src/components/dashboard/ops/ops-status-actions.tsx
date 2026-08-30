"use client"

import { Button } from "@/components/ui/button"
import { updateBookingStatus } from "@/lib/api/bookings"
import { bookingRowId, BOOKING_STATUS_TRANSITIONS } from "@/lib/bookings/status"
import type { Booking, BookingStatus } from "@/lib/types"
import { opsStrings } from "./ops-strings"
import { useState } from "react"

const ACTIONS: { status: BookingStatus; label: string }[] = [
  { status: "ARRIVED", label: opsStrings.arrived },
  { status: "IN_PROGRESS", label: opsStrings.inProgress },
  { status: "COMPLETED", label: opsStrings.completed },
  { status: "NO_SHOW", label: opsStrings.noShow },
]

export function OpsStatusActions({
  booking,
  onUpdated,
}: {
  booking: Booking
  onUpdated: (booking: Booking) => void
}) {
  const [loading, setLoading] = useState<string | null>(null)

  const run = async (status: BookingStatus) => {
    const id = bookingRowId(booking)
    setLoading(status)
    const { data, error } = await updateBookingStatus(
      id,
      status as "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "NO_SHOW",
    )
    setLoading(null)
    if (data?.booking) onUpdated(data.booking)
    if (error) return
  }

  const allowed = new Set(BOOKING_STATUS_TRANSITIONS[booking.status] ?? [])
  const visible = ACTIONS.filter((action) => allowed.has(action.status))
  if (visible.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2" data-prevent-row-click>
      {visible.map((action) => (
        <Button
          key={action.status}
          type="button"
          size="sm"
          variant={action.status === "NO_SHOW" ? "destructive" : "outline"}
          className="min-h-11"
          disabled={loading != null || booking.status === action.status}
          onClick={() => void run(action.status)}
        >
          {loading === action.status ? "…" : action.label}
        </Button>
      ))}
    </div>
  )
}
