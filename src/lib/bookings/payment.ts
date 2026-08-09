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
