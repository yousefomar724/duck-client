import { Badge } from "@/components/ui/badge"
import {
  bookingStatusColors,
  bookingStatusGroups,
  payoutStatusColors,
} from "@/lib/constants"
import type { BookingStatus, PayoutStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: BookingStatus | PayoutStatus
  type: "booking" | "payout"
  showGroup?: boolean
}

export default function StatusBadge({
  status,
  type,
  showGroup = false,
}: StatusBadgeProps) {
  const colors =
    type === "booking"
      ? bookingStatusColors[status as BookingStatus]
      : payoutStatusColors[status as PayoutStatus]

  const label =
    colors?.label ??
    (typeof status === "string" ? status : String(status ?? "—"))

  const groupLabel =
    type === "booking"
      ? bookingStatusGroups[(status as BookingStatus) ?? "PENDING"]?.label
      : undefined

  return (
    <Badge
      variant="secondary"
      title={showGroup && groupLabel ? groupLabel : undefined}
      className={cn(
        "font-medium whitespace-nowrap",
        colors?.bg ?? "bg-muted",
        colors?.text ?? "text-text-dark",
      )}
    >
      {label}
    </Badge>
  )
}
