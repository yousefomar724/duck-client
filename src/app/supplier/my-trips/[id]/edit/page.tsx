"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import PageHeader from "@/components/shared/page-header"
import TripForm from "@/components/shared/trip-form"
import { Card, CardContent } from "@/components/ui/card"
import { DetailPageSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import * as tripsApi from "@/lib/api/trips"
import type { Trip } from "@/lib/types"

interface EditTripPageProps {
  params: Promise<{ id: string }>
}

export default function EditTripPage({ params }: EditTripPageProps) {
  const router = useRouter()
  const [tripId, setTripId] = useState<number | null>(null)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrip = useCallback(async (id: number) => {
    setIsLoading(true)
    setError(null)
    const { data, error: fetchError } = await tripsApi.getTrip(id)
    if (fetchError) {
      setError(fetchError)
    } else if (data) {
      setTrip(data)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    params.then((resolvedParams) => {
      const id = parseInt(resolvedParams.id)
      setTripId(id)
      fetchTrip(id)
    })
  }, [params, fetchTrip])

  if (isLoading) {
    return (
      <div className="p-6">
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
      <div className="p-6">
        <PageHeader title="تعديل الرحلة" />
        <ErrorDisplay
          error={error}
          onRetry={() => tripId && fetchTrip(tripId)}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <PageHeader title="تعديل الرحلة" />
      <TripForm
        mode="edit"
        initialData={trip}
        onSuccess={() => router.push("/supplier/my-trips")}
        onCancel={() => router.back()}
      />
    </div>
  )
}
