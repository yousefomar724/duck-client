"use client"

import { Suspense } from "react"
import { ReportsView } from "@/components/dashboard/ops/reports-view"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"

export default function AdminReportsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ReportsView role="admin" />
    </Suspense>
  )
}
