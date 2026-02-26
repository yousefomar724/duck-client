"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import PageHeader from "@/components/shared/page-header"
import TripForm from "@/components/shared/trip-form"
import { DetailPageSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import * as suppliersApi from "@/lib/api/suppliers"
import type { Supplier } from "@/lib/types"

export default function AdminCreateTripPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data, error: fetchError } = await suppliersApi.getSuppliers()
      if (fetchError) {
        setError(fetchError)
      } else {
        setSuppliers(data || [])
      }
      setIsLoading(false)
    }
    fetchSuppliers()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="اضافة رحلة جديدة" />
        <DetailPageSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="اضافة رحلة جديدة" />
        <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="اضافة رحلة جديدة" />
      <TripForm
        mode="create"
        onSuccess={() => router.push("/admin/trips")}
        onCancel={() => router.back()}
        showSupplierField={true}
        suppliers={suppliers}
        useAdminImageUpload={true}
      />
    </div>
  )
}
