import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

type StatCardTone = "neutral" | "warning" | "success" | "danger"

const toneStyles: Record<
  StatCardTone,
  { border: string; iconBg: string; iconText: string }
> = {
  neutral: {
    border: "border-s-duck-cyan",
    iconBg: "from-duck-cyan/20 to-duck-cyan/5",
    iconText: "text-duck-cyan",
  },
  warning: {
    border: "border-s-amber-500",
    iconBg: "from-amber-500/20 to-amber-500/5",
    iconText: "text-amber-600",
  },
  success: {
    border: "border-s-emerald-500",
    iconBg: "from-emerald-500/20 to-emerald-500/5",
    iconText: "text-emerald-600",
  },
  danger: {
    border: "border-s-red-500",
    iconBg: "from-red-500/20 to-red-500/5",
    iconText: "text-red-600",
  },
}

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: string
    isPositive: boolean
  }
  tone?: StatCardTone
  hint?: string
  onClick?: () => void
  isActive?: boolean
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  tone = "neutral",
  hint,
  onClick,
  isActive = false,
}: StatCardProps) {
  const styles = toneStyles[tone]
  const isInteractive = Boolean(onClick)

  return (
    <Card
      className={cn(
        "border-s-4 hover:shadow-md transition-all",
        styles.border,
        isInteractive && "cursor-pointer hover:scale-[1.01]",
        isActive && "ring-2 ring-duck-cyan/40 shadow-md",
      )}
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-text-muted">{title}</p>
            <p className="mt-2 text-xl font-bold tracking-tight text-text-dark sm:text-2xl">
              {value}
            </p>
            {hint && (
              <p className="text-xs text-text-muted mt-1">{hint}</p>
            )}
            {trend && (
              <p
                className={cn(
                  "text-xs mt-2",
                  trend.isPositive ? "text-green-600" : "text-red-600",
                )}
              >
                {trend.value}
              </p>
            )}
          </div>
          <div className="me-4">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br sm:h-12 sm:w-12",
                styles.iconBg,
              )}
            >
              <Icon className={cn("w-6 h-6", styles.iconText)} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
