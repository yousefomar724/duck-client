import { paymentMethodLabels } from "@/lib/constants"
import type { Booking } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BookingPaymentBadgeProps {
  paymentMethod?: Booking["payment_method"]
  className?: string
}

export function BookingPaymentBadge({
  paymentMethod,
  className,
}: BookingPaymentBadgeProps) {
  if (!paymentMethod) {
    return <span className={cn("text-text-muted text-xs", className)}>—</span>
  }

  const isManual = paymentMethod === "MANUAL"

  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        isManual
          ? "bg-amber-100 text-amber-800"
          : "bg-duck-cyan/10 text-duck-cyan",
        className,
      )}
    >
      {paymentMethodLabels[paymentMethod]}
    </span>
  )
}
