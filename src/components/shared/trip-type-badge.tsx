import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface TripTypeBadgeProps {
  isTour?: boolean
  className?: string
}

export function TripTypeBadge({ isTour = false, className }: TripTypeBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-medium text-xs",
        isTour
          ? "bg-purple-100 text-purple-700"
          : "bg-blue-100 text-blue-700",
        className,
      )}
    >
      {isTour ? "جولة" : "رحلة"}
    </Badge>
  )
}
