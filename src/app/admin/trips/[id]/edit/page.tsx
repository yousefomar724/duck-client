"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import PageHeader from "@/components/shared/page-header"
import TripForm from "@/components/shared/trip-form"
import { Card, CardContent } from "@/components/ui/card"
import { DetailPageSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import * as tripsApi from "@/lib/api/trips"
import * as suppliersApi from "@/lib/api/suppliers"
import type { Trip, Supplier } from "@/lib/types"

interface EditTripPageProps {
  params: Promise<{ id: string }>
}

export default function AdminEditTripPage({ params }: EditTripPageProps) {
  const router = useRouter()
  const [tripId, setTripId] = useState<number | null>(null)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (id: number) => {
    setIsLoading(true)
    setError(null)

    const [tripRes, suppliersRes] = await Promise.all([
      tripsApi.getTrip(id, { omitLang: true }),
      suppliersApi.getSuppliers(),
    ])

    if (tripRes.error) {
      setError(tripRes.error)
    } else if (tripRes.data) {
      setTrip(tripRes.data)
    }

    if (!suppliersRes.error && suppliersRes.data) {
      setSuppliers(suppliersRes.data)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    params.then((resolvedParams) => {
      const id = parseInt(resolvedParams.id)
      setTripId(id)
      fetchData(id)
    })
  }, [params, fetchData])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="تعديل الرحلة" />
        <Card>
          <CardContent className="p-6">
            <DetailPageSkeleton />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="تعديل الرحلة" />
        <ErrorDisplay
          error={error}
          onRetry={() => tripId && fetchData(tripId)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="تعديل الرحلة" />
      <TripForm
        mode="edit"
        initialData={trip}
        onSuccess={() => router.push("/admin/trips")}
        onCancel={() => router.back()}
        showSupplierField={true}
        suppliers={suppliers}
        useAdminImageUpload={true}
      />
    </div>
  )
}
