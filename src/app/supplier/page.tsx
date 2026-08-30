"use client"

import { Suspense } from "react"
import { OpsHome } from "@/components/dashboard/ops/ops-home"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"

export default function SupplierHomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OpsHome role="supplier" basePath="/supplier" />
    </Suspense>
  )
}
