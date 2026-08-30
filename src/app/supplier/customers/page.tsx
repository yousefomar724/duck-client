"use client"

import { Suspense } from "react"
import { CustomersView } from "@/components/dashboard/ops/customers-view"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"

export default function SupplierCustomersPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <CustomersView role="supplier" />
    </Suspense>
  )
}
