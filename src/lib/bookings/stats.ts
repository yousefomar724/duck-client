import type { Booking, BookingStatus } from "@/lib/types"
import { amountPaid, remainingAmount, refundOwed } from "@/lib/bookings/payment"
import { bookingStatusMeta } from "@/lib/bookings/status"

export const REVENUE_STATUSES: readonly BookingStatus[] = [
  "CONFIRMED",
  "PAID",
  "SUCCESS",
  "COMPLETED",
]

const REVENUE_SET = new Set<string>(REVENUE_STATUSES)

export function refundDue(
  booking: Pick<Booking, "status" | "amount_paid" | "refund_owed">,
): number {
  const paid = amountPaid(booking)
  const owed = refundOwed(booking)
  if (booking.status === "REFUND_PENDING" || booking.status === "REFUND_FAILED") {
    return Math.max(paid, owed)
  }
  return owed
}

export interface BookingStats {
  total: number
  needsAction: number
  upcoming: number
  completed: number
  cancelled: number
  bookedRevenue: number
  grossCollected: number
  refundDueTotal: number
  netCollected: number
  outstanding: number
  pipeline: number
}

type StatsBooking = Pick<
  Booking,
  "status" | "amount" | "amount_paid" | "refund_owed"
>

export function computeBookingStats(bookings: StatsBooking[]): BookingStats {
  let bookedRevenue = 0
  let grossCollected = 0
  let refundDueTotal = 0
  let outstanding = 0
  let pipeline = 0
  let needsActionCount = 0
  let upcoming = 0
  let completed = 0
  let cancelled = 0

  for (const booking of bookings) {
    const group = bookingStatusMeta[booking.status]?.group
    if (group === "needsAction") needsActionCount += 1
    else if (group === "upcoming") upcoming += 1
    else if (group === "completed") completed += 1
    else if (group === "cancelled") cancelled += 1

    if (REVENUE_SET.has(booking.status)) {
      bookedRevenue += booking.amount
      outstanding += remainingAmount(booking)
    }
    if (booking.status === "PENDING") {
      pipeline += booking.amount
    }
    if (booking.status !== "REFUNDED") {
      grossCollected += amountPaid(booking)
    }
    refundDueTotal += refundDue(booking)
  }

  return {
    total: bookings.length,
    needsAction: needsActionCount,
    upcoming,
    completed,
    cancelled,
    bookedRevenue,
    grossCollected,
    refundDueTotal,
    netCollected: grossCollected - refundDueTotal,
    outstanding,
    pipeline,
  }
}
