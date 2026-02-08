import { Badge } from "@/components/ui/badge"
import { bookingStatusColors, payoutStatusColors } from "@/lib/constants"
import type { BookingStatus, PayoutStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: BookingStatus | PayoutStatus
  type: "booking" | "payout"
}

export default function StatusBadge({ status, type }: StatusBadgeProps) {
  const colors =
    type === "booking"
      ? bookingStatusColors[status as BookingStatus]
      : payoutStatusColors[status as PayoutStatus]

  return (
    <Badge
      variant="secondary"
      className={cn("font-medium", colors.bg, colors.text)}
    >
      {colors.label}
    </Badge>
  )
}
