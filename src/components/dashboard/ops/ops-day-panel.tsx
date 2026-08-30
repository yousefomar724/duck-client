"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { BAND_CLASS } from "./heat"
import { bandLabels, opsStrings } from "./ops-strings"
import type { OpsHourRow } from "@/lib/api/ops"
import { formatCurrency } from "@/lib/constants"

export function OpsDayPanel({
  date,
  hours,
  summary,
  capacity,
  selectedHour,
  basePath,
  onSelectHour,
}: {
  date: string
  hours: OpsHourRow[]
  summary: { bookings: number; guests: number; units: number; revenue: number } | null
  capacity: number
  selectedHour?: string
  basePath: string
  onSelectHour?: (hour: string) => void
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{date}</h2>
        {summary ? (
          <p className="text-sm text-text-muted">
            {summary.bookings} حجوزات · {summary.guests} ضيوف · {opsStrings.unitsDispatched}{" "}
            {summary.units} · {formatCurrency(summary.revenue)}
          </p>
        ) : null}
      </div>
      <ul className="space-y-2">
        {hours.map((row) => {
          const inner = (
            <div
              className={cn(
                "flex min-h-14 cursor-pointer items-center justify-between rounded-xl border px-3 py-2",
                selectedHour === row.hour && "ring-2 ring-duck-cyan",
              )}
            >
              <div>
                <p className="font-semibold">{row.hour}</p>
                <p className="text-xs text-text-muted">
                  {row.units} / {capacity || row.capacity} · {row.bookings} حجوزات
                </p>
              </div>
              <span className={cn("rounded-full px-2 py-1 text-xs font-medium", BAND_CLASS[row.band])}>
                {bandLabels[row.band]}
              </span>
            </div>
          )
          if (onSelectHour) {
            return (
              <li key={row.hour}>
                <button type="button" className="w-full text-start" onClick={() => onSelectHour(row.hour)}>
                  {inner}
                </button>
              </li>
            )
          }
          return (
            <li key={row.hour}>
              <Link href={`${basePath}/calendar/${date}/${row.hour}`}>{inner}</Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
