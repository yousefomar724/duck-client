import { Badge } from "@/components/ui/badge"
import { bookingStatusMeta } from "@/lib/bookings/status"
import { payoutStatusColors } from "@/lib/constants"
import type { BookingStatus, PayoutStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: BookingStatus | PayoutStatus
  type: "booking" | "payout"
}

export default function StatusBadge({ status, type }: StatusBadgeProps) {
  if (type === "booking") {
    const meta = bookingStatusMeta[status as BookingStatus]
    const Icon = meta?.icon
    const label =
      meta?.label ??
      (typeof status === "string" ? status : String(status ?? "—"))

    return (
      <Badge
        variant="secondary"
        className={cn(
          "font-medium gap-1",
          meta?.bg ?? "bg-gray-100",
          meta?.text ?? "text-gray-800",
        )}
      >
        {Icon && <Icon className="size-3" aria-hidden />}
        {label}
      </Badge>
    )
  }

  const colors = payoutStatusColors[status as PayoutStatus]
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
