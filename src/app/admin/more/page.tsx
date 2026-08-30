"use client"

import { Suspense } from "react"
import { OpsMore } from "@/components/dashboard/ops/ops-more"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"

export default function AdminMorePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OpsMore role="admin" basePath="/admin" />
    </Suspense>
  )
}
