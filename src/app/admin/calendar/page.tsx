"use client"

import { Suspense } from "react"
import { OpsWorkspace } from "@/components/dashboard/ops/ops-workspace"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"

export default function AdminCalendarPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OpsWorkspace role="admin" basePath="/admin" level="month" />
    </Suspense>
  )
}
