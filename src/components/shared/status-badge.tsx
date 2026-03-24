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

  const label =
    colors?.label ??
    (typeof status === "string" ? status : String(status ?? "—"))

  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-medium",
        colors?.bg ?? "bg-gray-100",
        colors?.text ?? "text-gray-800",
      )}
    >
      {label}
    </Badge>
  )
}
