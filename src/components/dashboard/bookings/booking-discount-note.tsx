"use client"

import { discountStrings } from "@/lib/dashboard/discount-strings"
import { discountAmount, subtotalOf } from "@/lib/bookings/payment"
import { isManualDiscount } from "@/lib/booking/discount"
import { formatCurrency } from "@/lib/constants"
import type { Booking, BookingDiscount } from "@/lib/types"

const MANUAL_LABEL = "خصم يدوي"

/** What staff see for a booking's discount: the code, or "خصم يدوي". */
export function discountDisplayName(
  discount: Pick<BookingDiscount, "code" | "source"> | null | undefined,
): string {
  if (!discount) return ""
  return isManualDiscount(discount) ? MANUAL_LABEL : discount.code
}

export function BookingDiscountNote({
  booking,
  detailed = false,
}: {
  booking: Pick<Booking, "amount" | "currency" | "subtotal" | "discount">
  detailed?: boolean
}) {
  if (!booking.discount || discountAmount(booking) <= 0) return null
  const manual = isManualDiscount(booking.discount)
  return (
    <div className="text-xs text-text-muted space-y-0.5" data-testid="booking-discount">
      <div>
        <span
          className={manual ? "font-medium" : "font-mono font-medium"}
          dir={manual ? undefined : "ltr"}
        >
          {discountDisplayName(booking.discount)}
        </span>
        {detailed ? (
          <>
            {" · "}
            {discountStrings.subtotal}{" "}
            {formatCurrency(subtotalOf(booking), booking.currency)}
            {" − "}
            {formatCurrency(booking.discount.amount, booking.currency)}
          </>
        ) : null}
      </div>
      {detailed && manual && booking.discount.reason ? (
        <div>{booking.discount.reason}</div>
      ) : null}
      {booking.discount.funded_by === "platform" ? (
        <div>
          {discountStrings.coveredByDuck}:{" "}
          {formatCurrency(booking.discount.amount, booking.currency)}
        </div>
      ) : null}
    </div>
  )
}
