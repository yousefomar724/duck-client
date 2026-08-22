import type { Booking } from "@/lib/types"

export type PaymentState = "UNPAID" | "PARTIAL" | "PAID" | "REFUND_OWED"

export function amountPaid(booking: Pick<Booking, "amount_paid">): number {
  return booking.amount_paid ?? 0
}

export function refundOwed(booking: Pick<Booking, "refund_owed">): number {
  return booking.refund_owed ?? 0
}

export function remainingAmount(
  booking: Pick<Booking, "amount" | "amount_paid">,
): number {
  return Math.max(0, booking.amount - amountPaid(booking))
}

/** Statuses where an unpaid balance is meaningless — the booking is dead or being refunded. */
const NO_BALANCE_STATUSES = new Set<string>([
  "CANCELLED",
  "FAILED",
  "REFUNDED",
  "REFUND_PENDING",
  "REFUND_FAILED",
])

/** What the customer still owes, as it should be *displayed*. 0 for refunded/cancelled. */
export function outstandingBalance(
  booking: Pick<Booking, "status" | "amount" | "amount_paid">,
): number {
  if (NO_BALANCE_STATUSES.has(booking.status)) return 0
  return remainingAmount(booking)
}

export function paymentState(
  booking: Pick<Booking, "amount" | "amount_paid" | "refund_owed">,
): PaymentState {
  if (refundOwed(booking) > 0) return "REFUND_OWED"
  const paid = amountPaid(booking)
  if (paid <= 0) return "UNPAID"
  if (paid >= booking.amount) return "PAID"
  return "PARTIAL"
}

/** What the supplier should expect to receive — the customer's declared amount, or the full total if unset. */
export function expectedAmount(
  booking: Pick<Booking, "amount" | "declared_amount">,
): number {
  return booking.declared_amount && booking.declared_amount > 0
    ? booking.declared_amount
    : booking.amount
}
