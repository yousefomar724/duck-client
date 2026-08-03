import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: string
    isPositive: boolean
  }
  onClick?: () => void
  active?: boolean
  className?: string
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  onClick,
  active = false,
  className,
}: StatCardProps) {
  const interactive = Boolean(onClick)

  return (
    <Card
      className={cn(
        "border-s-4 border-s-duck-cyan transition-shadow duration-200",
        interactive && "cursor-pointer hover:shadow-md focus-within:ring-2 focus-within:ring-duck-cyan focus-within:ring-offset-2",
        active && "border-s-duck-navy bg-duck-cyan/5 shadow-md",
        !interactive && "hover:shadow-md",
        className,
      )}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? active : undefined}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-muted">{title}</p>
            <p className="dashboard-kpi-value mt-2 text-2xl font-bold tracking-tight text-text-dark">
              {value}
            </p>
            {trend && (
              <p
                className={cn(
                  "mt-2 text-xs",
                  trend.isPositive ? "text-emerald-700" : "text-red-700",
                )}
              >
                {trend.value}
              </p>
            )}
          </div>
          <div className="shrink-0">
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-duck-cyan/20 to-duck-cyan/5 sm:size-12">
              <Icon className="size-5 text-duck-cyan sm:size-6" aria-hidden />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
