"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { HEAT_CLASS } from "./heat"
import type { OpsCalendarDay } from "@/lib/api/ops"
import { addSiteDays } from "@/lib/time"
import { ChevronRight } from "lucide-react"

const WEEKDAYS = ["ح", "ن", "ث", "ر", "خ", "ج", "س"]

function weekdayIndex(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number)
  return new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric" }).format(
    new Date(y, m - 1, 1),
  )
}

export function OpsMonthGrid({
  month,
  days,
  selected,
  basePath,
  onSelect,
}: {
  month: string
  days: OpsCalendarDay[]
  selected?: string
  basePath: string
  onSelect?: (ymd: string) => void
}) {
  const first = `${month}-01`
  const startPad = weekdayIndex(first)
  const cells: (OpsCalendarDay | null)[] = Array.from({ length: startPad }, () => null)
  for (const day of days) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)

  const prev = addSiteDays(first, -1).slice(0, 7)
  const lastDay = days[days.length - 1]?.ymd ?? first
  const next = addSiteDays(lastDay, 1).slice(0, 7)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <Link
          href={`${basePath}/calendar?month=${prev}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-muted"
          aria-label="الشهر السابق"
        >
          <ChevronRight className="size-5" />
        </Link>
        <h2 className="text-lg font-semibold">{monthLabel(month)}</h2>
        <Link
          href={`${basePath}/calendar?month=${next}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-muted"
          aria-label="الشهر التالي"
        >
          <ChevronRight className="size-5 rotate-180" />
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const inner = (
            <button
              type="button"
              onClick={() => onSelect?.(day.ymd)}
              className={cn(
                "flex min-h-14 w-full flex-col items-center justify-center rounded-lg text-sm",
                HEAT_CLASS[day.heat],
                selected === day.ymd && "ring-2 ring-duck-cyan",
              )}
            >
              <span className="font-semibold">{Number(day.ymd.slice(8))}</span>
              {day.bookings > 0 ? (
                <span className="text-[10px]">{day.bookings}</span>
              ) : null}
            </button>
          )
          if (onSelect) return <div key={day.ymd}>{inner}</div>
          return (
            <Link key={day.ymd} href={`${basePath}/calendar/${day.ymd}`}>
              {inner}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
