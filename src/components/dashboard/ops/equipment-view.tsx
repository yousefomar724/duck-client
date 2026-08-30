"use client"

import { useEffect, useState } from "react"
import { getOpsSummary, type OpsCapacity } from "@/lib/api/ops"
import { opsStrings } from "./ops-strings"
import { toSiteYmd, siteMinutesOfDay } from "@/lib/time"
import { resourceLabels } from "@/lib/bookings/status"

const RESOURCE_ORDER = ["kayak", "water_cycle", "sup"] as const

export function EquipmentView({
  supplierId,
  refreshToken = 0,
}: {
  supplierId?: string | null
  refreshToken?: number
}) {
  const [capacity, setCapacity] = useState<OpsCapacity | null>(null)
  const [inUse, setInUse] = useState(0)

  useEffect(() => {
    const today = toSiteYmd(new Date())
    const id = window.setTimeout(() => {
      void getOpsSummary(today, supplierId).then(({ data }) => {
        if (!data) return
        setCapacity(data.capacity)
        const hour = Math.floor(siteMinutesOfDay(new Date()) / 60)
        const nowHour = `${String(hour).padStart(2, "0")}:00`
        const current =
          data.hours.find((h) => h.hour === nowHour) ??
          data.hours.reduce<(typeof data.hours)[number] | null>(
            (best, row) => (!best || row.units > best.units ? row : best),
            null,
          )
        setInUse(current?.units ?? 0)
      })
    }, 0)
    return () => window.clearTimeout(id)
  }, [supplierId, refreshToken])

  const rows = [...(capacity?.per_resource ?? [])].sort(
    (a, b) => RESOURCE_ORDER.indexOf(a.type as (typeof RESOURCE_ORDER)[number]) -
      RESOURCE_ORDER.indexOf(b.type as (typeof RESOURCE_ORDER)[number]),
  )

  const available = capacity?.total ?? 0
  const maintenance = rows.reduce((sum, r) => sum + r.maintenance, 0)
  const total = available + maintenance

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={opsStrings.total} value={total} />
        <Stat label={opsStrings.inUse} value={inUse} />
        <Stat label={opsStrings.available} value={Math.max(0, available - inUse)} />
        <Stat label={opsStrings.maintenance} value={maintenance} />
      </div>
      {rows.length > 0 ? (
        <ul className="divide-y rounded-xl border bg-white">
          {rows.map((row) => {
            const fleet = row.capacity + row.maintenance
            return (
              <li key={row.type} className="flex min-h-14 items-center justify-between gap-3 px-4 text-sm">
                <span className="font-medium">
                  {resourceLabels[row.type] ?? row.type}
                </span>
                <span className="text-text-muted">
                  {row.capacity} {opsStrings.available} · {row.maintenance}{" "}
                  {opsStrings.maintenance} · {fleet} {opsStrings.total}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}
