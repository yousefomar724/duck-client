"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import PageHeader from "@/components/shared/page-header"
import StatCard from "@/components/shared/stat-card"
import { CalendarCheck, Clock, Bell, Users } from "lucide-react"
import { getOpsSummary } from "@/lib/api/ops"
import { formatCurrency } from "@/lib/constants"
import { toSiteYmd } from "@/lib/time"
import { resolveLocalizedField } from "@/lib/dashboard/localize"
import { DataCardList } from "@/components/dashboard/data-card-list"
import StatusBadge from "@/components/shared/status-badge"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import { opsStrings } from "./ops-strings"
import type { Booking } from "@/lib/types"
import { useOpsScope } from "./use-ops-scope"

export function OpsHome({
  role,
  basePath,
}: {
  role: "admin" | "supplier"
  basePath: string
}) {
  const { supplierId } = useOpsScope(role)
  const today = toSiteYmd(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{
    bookings: number
    guests: number
    units: number
    revenue: number
  } | null>(null)
  const [upcoming, setUpcoming] = useState(0)
  const [unread, setUnread] = useState(0)
  const [nextSlot, setNextSlot] = useState<{ hour: string; bookings: number } | null>(null)
  const [top, setTop] = useState<Booking[]>([])

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await getOpsSummary(today, supplierId)
    setLoading(false)
    if (err || !data) {
      setError(err ?? "فشل التحميل")
      return
    }
    setSummary(data.summary)
    setUpcoming(data.upcoming)
    setUnread(data.unread_notifications)
    setNextSlot(data.next_slot)
    setTop(data.top_bookings)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, supplierId])

  if (loading) return <DashboardSkeleton />
  if (error) return <ErrorDisplay error={error} onRetry={() => void load()} />

  return (
    <div className="space-y-6">
      <PageHeader title={opsStrings.home} description={today} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title={opsStrings.todayLoad}
          value={summary?.bookings ?? 0}
          icon={CalendarCheck}
          onClick={() => {
            window.location.href = `${basePath}/calendar/${today}`
          }}
        />
        <StatCard
          title={opsStrings.nextSlot}
          value={nextSlot?.hour ?? "—"}
          icon={Clock}
          hint={nextSlot ? `${nextSlot.bookings} حجوزات` : undefined}
        />
        <StatCard title={opsStrings.upcoming} value={upcoming} icon={Users} />
        <StatCard
          title={opsStrings.unread}
          value={unread}
          icon={Bell}
          tone={unread > 0 ? "warning" : "neutral"}
        />
      </div>
      {summary ? (
        <p className="text-sm text-text-muted">
          {opsStrings.unitsDispatched}: {summary.units} · {formatCurrency(summary.revenue)}
        </p>
      ) : null}
      <DataCardList
        className="md:block"
        items={top.map((booking) => ({
          id: booking.ID,
          title: booking.full_name,
          subtitle: resolveLocalizedField(booking.trip?.name, "—"),
          badge: (
            <StatusBadge
              status={booking.status}
              type="booking"
              short
              bookingDate={booking.booking_date}
              endsAt={booking.ends_at}
            />
          ),
          onClick: () => {
            window.location.href = `${basePath}/bookings?q=${encodeURIComponent(booking.ID)}`
          },
        }))}
      />
      <Link href={`${basePath}/calendar/${today}`} className="text-sm font-medium text-duck-cyan">
        فتح تقويم اليوم
      </Link>
    </div>
  )
}
