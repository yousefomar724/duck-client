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
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
}: StatCardProps) {
  return (
    <Card className="border-s-4 border-s-duck-cyan hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-text-muted">{title}</p>
            <p className="text-2xl font-bold tracking-tight text-text-dark mt-2">{value}</p>
            {trend && (
              <p
                className={cn(
                  "text-xs mt-2",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )}
              >
                {trend.value}
              </p>
            )}
          </div>
          <div className="me-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-duck-cyan/20 to-duck-cyan/5 flex items-center justify-center">
              <Icon className="w-6 h-6 text-duck-cyan" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
