import type { Booking } from "@/lib/types"

export type PaymentState = "UNPAID" | "PARTIAL" | "PAID" | "REFUND_OWED"

export function amountPaid(booking: Pick<Booking, "amount_paid">): number {
  return booking.amount_paid ?? 0
}

export function refundOwed(booking: Pick<Booking, "refund_owed">): number {
  return booking.refund_owed ?? 0
}

/**
 * What the supplier's wallet still holds for this booking. `amount_paid` is
 * gross until an edit's refund is marked sent; the owed part has already been
 * debited from the wallet, so it must not be debited again.
 */
export function retainedAmount(
  booking: Pick<Booking, "amount_paid" | "refund_owed">,
): number {
  return Math.max(0, amountPaid(booking) - refundOwed(booking))
}

/** List price before discount. Older bookings have no subtotal and are read as `amount`. */
export function subtotalOf(
  booking: Pick<Booking, "amount"> & { subtotal?: number | null },
): number {
  if (booking.subtotal != null && booking.subtotal > 0) return booking.subtotal
  return booking.amount
}

export function discountAmount(
  booking: { discount?: { amount?: number } | null },
): number {
  return booking.discount?.amount ?? 0
}

/** What the supplier has earned on this booking: customer money still held, plus Duck's credit. */
export function supplierEarnings(
  booking: Pick<Booking, "amount_paid" | "refund_owed"> & {
    platform_discount_credited?: number | null
  },
): number {
  return retainedAmount(booking) + (booking.platform_discount_credited ?? 0)
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
