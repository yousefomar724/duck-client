"use client"

import { useEffect, useState } from "react"
import PageHeader from "@/components/shared/page-header"
import { getReportsOverview } from "@/lib/api/reports"
import { addSiteDays, toSiteYmd } from "@/lib/time"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { opsStrings } from "./ops-strings"
import { useOpsScope } from "./use-ops-scope"
import { formatCurrency } from "@/lib/constants"
import { resolveLocalizedField } from "@/lib/dashboard/localize"
import { ErrorDisplay } from "@/components/shared/error-display"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"

const chartConfig = {
  revenue: { label: "الإيرادات", color: "var(--duck-cyan)" },
  bookings: { label: "الحجوزات", color: "var(--duck-yellow)" },
} satisfies ChartConfig

export function ReportsView({ role }: { role: "admin" | "supplier" }) {
  const { supplierId } = useOpsScope(role)
  const to = toSiteYmd(new Date())
  const from = addSiteDays(to, -29)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Awaited<ReturnType<typeof getReportsOverview>>["data"]>(null)

  useEffect(() => {
    let cancelled = false
    const id = window.setTimeout(() => {
      setLoading(true)
      getReportsOverview(from, to, supplierId).then(({ data: next, error: err }) => {
        if (cancelled) return
        setLoading(false)
        if (err || !next) setError(err ?? "فشل التحميل")
        else setData(next)
      })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [from, to, supplierId])

  if (loading) return <DashboardSkeleton />
  if (error || !data) return <ErrorDisplay error={error ?? "فشل التحميل"} />

  return (
    <div className="space-y-6">
      <PageHeader title={opsStrings.reports} description={`${from} — ${to}`} />
      <ChartContainer config={chartConfig} className="h-64 w-full">
        <BarChart data={data.by_day.map((d) => ({ day: d._id, revenue: d.revenue, bookings: d.bookings }))}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
        </BarChart>
      </ChartContainer>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">الأنشطة الأكثر طلباً</h2>
          <ul className="space-y-2 text-sm">
            {data.popular_activities.map((row) => (
              <li key={row.trip_id} className="flex justify-between">
                <span>{resolveLocalizedField(row.name as { ar: string; en: string } | undefined, "—")}</span>
                <span className="text-text-muted">{row.bookings}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">مصادر الحجز</h2>
          <ul className="space-y-2 text-sm">
            {data.sources.map((row) => (
              <li key={row._id} className="flex justify-between">
                <span>{row._id === "walk_in" ? opsStrings.sourceWalkIn : opsStrings.sourceOnline}</span>
                <span>{row.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-text-muted">
            مصري {data.nationality.local} · أجنبي {data.nationality.foreign} · إيرادات الفترة{" "}
            {formatCurrency(data.by_day.reduce((s, d) => s + d.revenue, 0))}
          </p>
        </section>
      </div>
    </div>
  )
}
