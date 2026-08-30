"use client"

import { Suspense } from "react"
import { OpsNotifications } from "@/components/dashboard/ops/ops-notifications"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"

export default function SupplierNotificationsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OpsNotifications role="supplier" />
    </Suspense>
  )
}
