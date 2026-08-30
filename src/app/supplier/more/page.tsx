"use client"

import { Suspense } from "react"
import { OpsMore } from "@/components/dashboard/ops/ops-more"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"

export default function SupplierMorePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OpsMore role="supplier" basePath="/supplier" />
    </Suspense>
  )
}
