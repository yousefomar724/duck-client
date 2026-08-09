import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { paymentState, type PaymentState } from "@/lib/bookings/payment"
import type { Booking } from "@/lib/types"

const paymentStateLabels: Record<PaymentState, string> = {
  PAID: "مدفوع بالكامل",
  PARTIAL: "مدفوع جزئياً",
  UNPAID: "غير مدفوع",
}

const paymentStateStyles: Record<PaymentState, string> = {
  PAID: "bg-green-100 text-green-800",
  PARTIAL: "bg-amber-100 text-amber-900",
  UNPAID: "bg-slate-100 text-slate-700",
}

interface PaymentStateBadgeProps {
  booking: Pick<Booking, "amount" | "amount_paid">
  className?: string
}

export function PaymentStateBadge({
  booking,
  className,
}: PaymentStateBadgeProps) {
  const state = paymentState(booking)

  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-medium text-xs",
        paymentStateStyles[state],
        className,
      )}
    >
      {paymentStateLabels[state]}
    </Badge>
  )
}
