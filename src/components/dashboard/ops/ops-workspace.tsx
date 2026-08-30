"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { isValidYmd, toSiteYmd } from "@/lib/time"
import { isValidSlotHHMM } from "@/lib/booking/occupancy"
import { OpsMonthGrid } from "./ops-month-grid"
import { OpsDayPanel } from "./ops-day-panel"
import { OpsHourPanel } from "./ops-hour-panel"
import { useOpsCalendar, useOpsDay, useOpsHour } from "./use-ops-data"
import { useOpsScope } from "./use-ops-scope"
import { opsStrings } from "./ops-strings"
import { useToast } from "@/lib/stores/toast-store"
import { Skeleton } from "@/components/ui/skeleton"

export type OpsLevel = "month" | "day" | "hour"

export function OpsWorkspace({
  role,
  basePath,
  level,
  date,
  time,
}: {
  role: "admin" | "supplier"
  basePath: string
  level: OpsLevel
  date?: string
  time?: string
}) {
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const { supplierId } = useOpsScope(role)
  const today = toSiteYmd(new Date())
  const monthParam = searchParams.get("month")
  const validDate = date && isValidYmd(date) ? date : today
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : validDate.slice(0, 7)
  const validTime = time && isValidSlotHHMM(time) ? time : undefined

  useEffect(() => {
    if (time && !validTime) {
      addToast(opsStrings.invalidTime, "warning")
    }
  }, [time, validTime, addToast])

  const calendar = useOpsCalendar(month, supplierId)
  const day = useOpsDay(validDate, supplierId)
  const hourTime = validTime ?? day.hours.find((h) => h.bookings > 0)?.hour ?? "09:00"
  const hour = useOpsHour(validDate, hourTime, supplierId)

  const backHref =
    level === "hour"
      ? `${basePath}/calendar/${validDate}`
      : level === "day"
        ? `${basePath}/calendar`
        : `${basePath}`

  return (
    <div className="space-y-4">
      {level !== "month" ? (
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-duck-cyan lg:hidden"
        >
          <ChevronRight className="size-4" />
          رجوع
        </Link>
      ) : null}

      {calendar.loading && level === "month" ? <Skeleton className="h-72 w-full" /> : null}

      <div className="lg:grid lg:grid-cols-[320px_360px_1fr] lg:gap-4">
        <section className={cn(level !== "month" && "hidden lg:block")}>
          <OpsMonthGrid
            month={month}
            days={calendar.days}
            selected={validDate}
            basePath={basePath}
          />
        </section>
        <section className={cn(level !== "day" && "hidden lg:block")}>
          <OpsDayPanel
            date={validDate}
            hours={day.hours}
            summary={day.summary}
            capacity={day.capacity}
            selectedHour={hourTime}
            basePath={basePath}
          />
        </section>
        <section className={cn(level !== "hour" && "hidden lg:block")}>
          <OpsHourPanel
            date={validDate}
            time={hourTime}
            bookings={hour.bookings}
            units={hour.units}
            capacity={hour.capacity}
            pct={hour.pct}
            band={hour.band}
            role={role}
            onReload={() => {
              void hour.reload()
              void day.reload()
              void calendar.reload()
            }}
            onUpdated={() => void hour.reload()}
          />
        </section>
      </div>
    </div>
  )
}
