import { notFound } from "next/navigation"
import { Suspense } from "react"
import { isValidYmd } from "@/lib/time"
import { OpsWorkspace } from "@/components/dashboard/ops/ops-workspace"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"

export default async function AdminDayPage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params
  if (!isValidYmd(date)) notFound()
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OpsWorkspace role="admin" basePath="/admin" level="day" date={date} />
    </Suspense>
  )
}
