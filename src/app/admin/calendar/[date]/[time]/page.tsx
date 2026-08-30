import { notFound } from "next/navigation"
import { Suspense } from "react"
import { isValidYmd } from "@/lib/time"
import { SLOT_HHMM_PATTERN } from "@/lib/booking/occupancy"
import { OpsWorkspace } from "@/components/dashboard/ops/ops-workspace"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"

export default async function AdminHourPage({
  params,
}: {
  params: Promise<{ date: string; time: string }>
}) {
  const { date, time } = await params
  if (!isValidYmd(date)) notFound()
  const decoded = decodeURIComponent(time)
  const level = SLOT_HHMM_PATTERN.test(decoded) ? "hour" : "day"
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OpsWorkspace
        role="admin"
        basePath="/admin"
        level={level}
        date={date}
        time={level === "hour" ? decoded : decoded}
      />
    </Suspense>
  )
}
