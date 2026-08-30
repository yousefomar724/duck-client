"use client"

import { Suspense } from "react"
import { OpsWorkspace } from "@/components/dashboard/ops/ops-workspace"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"

export default function SupplierCalendarPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OpsWorkspace role="supplier" basePath="/supplier" level="month" />
    </Suspense>
  )
}
