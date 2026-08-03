import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PaymentMethodBadgeProps {
  method?: "KASHIER" | "MANUAL"
  className?: string
}

export function PaymentMethodBadge({
  method,
  className,
}: PaymentMethodBadgeProps) {
  if (!method) return <span className="text-text-muted">—</span>

  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-medium text-xs",
        method === "MANUAL"
          ? "bg-amber-100 text-amber-700"
          : "bg-blue-100 text-blue-700",
        className,
      )}
    >
      {method === "MANUAL" ? "إنستاباي / يدوي" : "كاشير"}
    </Badge>
  )
}
