"use client"

import { discountStrings } from "@/lib/dashboard/discount-strings"
import { discountAmount, subtotalOf } from "@/lib/bookings/payment"
import { formatCurrency } from "@/lib/constants"
import type { Booking } from "@/lib/types"

export function BookingDiscountNote({
  booking,
  detailed = false,
}: {
  booking: Pick<Booking, "amount" | "currency" | "subtotal" | "discount">
  detailed?: boolean
}) {
  if (!booking.discount || discountAmount(booking) <= 0) return null
  return (
    <div className="text-xs text-text-muted space-y-0.5" data-testid="booking-discount">
      <div>
        <span className="font-mono font-medium" dir="ltr">
          {booking.discount.code}
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
      {booking.discount.funded_by === "platform" ? (
        <div>
          {discountStrings.coveredByDuck}:{" "}
          {formatCurrency(booking.discount.amount, booking.currency)}
        </div>
      ) : null}
    </div>
  )
}
