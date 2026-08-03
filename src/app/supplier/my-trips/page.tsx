"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Pencil, Trash2, Ship } from "lucide-react"
import { DuckLogoPlaceholder } from "@/components/shared/duck-logo-placeholder"
import { ImageWithLogoFallback } from "@/components/shared/image-with-logo-fallback"
import PageHeader from "@/components/shared/page-header"
import { TripTypeBadge } from "@/components/shared/trip-type-badge"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { formatCurrency } from "@/lib/constants"
import { getTripImage, resolveImageUrl } from "@/lib/image-utils"
import { resolveLocalizedField } from "@/lib/dashboard/localize"
import * as tripsApi from "@/lib/api/trips"
import { CardGridSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import { Trip } from "@/lib/types"

function TripCardMedia({
  fullImageUrl,
  name,
}: {
  fullImageUrl: string | null
  name: string
}) {
  const [videoFailed, setVideoFailed] = useState(false)
  if (!fullImageUrl) return <DuckLogoPlaceholder />
  if (fullImageUrl.endsWith(".mp4")) {
    if (videoFailed) return <DuckLogoPlaceholder />
    return (
      <video
        src={fullImageUrl}
        className="w-full h-full object-cover"
        muted
        loop
        autoPlay
        onError={() => setVideoFailed(true)}
      />
    )
  }
  return (
    <ImageWithLogoFallback
      src={fullImageUrl}
      alt={name}
      fill
      sizes="(max-width: 768px) 100vw, 400px"
      className="object-cover"
      fallbackClassName="object-contain p-4"
    />
  )
}

function getTripDestinationLabel(trip: Trip): string | null {
  const names = (trip.destinations ?? [])
    .map((destination) => resolveLocalizedField(destination.name, ""))
    .filter(Boolean)
  if (names.length > 0) return names.join("، ")
  if (trip.destination) return "—"
  return null
}

export default function MyTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchTrips = async () => {
    setIsLoading(true)
    setError(null)
    const { data, error: fetchError } = await tripsApi.getMyTrips("ar")
    // The API can return HTTP 200 with `data: null` when the supplier has no trips yet.
    // In that case we should show the empty state, not an error.
    if (fetchError && data == null) {
      setTrips([])
    } else if (fetchError) {
      setError(fetchError)
    } else {
      setTrips(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    const id = setTimeout(() => fetchTrips(), 0)
    return () => clearTimeout(id)
  }, [])

  const handleDelete = async (tripId: string) => {
    setIsDeleting(true)
    const { error: deleteError } = await tripsApi.deleteTrip(tripId)
    if (deleteError) {
      setError(deleteError)
    } else {
      setTrips(trips.filter((trip) => trip.id !== tripId))
      setDeleteId(null)
    }
    setIsDeleting(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="رحلاتي وجولاتي"
          description="إدارة الرحلات والجولات المتاحة للحجز"
        >
          <Button disabled>+ اضافة رحلة / جولة</Button>
        </PageHeader>
        <CardGridSkeleton count={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="رحلاتي وجولاتي"
          description="إدارة الرحلات والجولات المتاحة للحجز"
        >
          <Button disabled>+ اضافة رحلة / جولة</Button>
        </PageHeader>
        <ErrorDisplay error={error} onRetry={fetchTrips} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="رحلاتي وجولاتي"
        description="إدارة الرحلات والجولات المتاحة للحجز"
      >
        <Button
          asChild
          className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy"
        >
          <Link href="/supplier/my-trips/create">+ اضافة رحلة / جولة</Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.map((trip) => {
          const fullImageUrl = resolveImageUrl(getTripImage(trip.images))
          const destinationLabel = getTripDestinationLabel(trip)

          return (
            <Card
              key={trip.id}
              className="overflow-hidden py-0! hover:shadow-lg transition-all duration-200 gap-0!"
            >
              <div className="relative h-48 w-full">
                <span className="absolute top-2 start-2 z-10">
                  <TripTypeBadge isTour={trip.is_tour} />
                </span>
                <TripCardMedia
                  fullImageUrl={fullImageUrl}
                  name={
                    typeof trip.name === "string"
                      ? trip.name
                      : trip.name?.ar || "Trip"
                  }
                />
              </div>
              <CardContent className="p-4">
                <h3 className="font-bold text-lg mb-2 text-duck-navy">
                  {typeof trip.name === "string"
                    ? trip.name
                    : trip.name?.ar || "بدون عنوان"}
                </h3>
                <div className="space-y-1 text-sm text-text-body">
                  {destinationLabel ? (
                    <p>
                      <span className="font-medium">الوجهة:</span>{" "}
                      {destinationLabel}
                    </p>
                  ) : null}
                  {trip.location && (
                    <p>
                      <span className="font-medium">الموقع:</span> نعم
                    </p>
                  )}
                  <p>
                    <span className="font-medium">السعر للمصريين:</span>{" "}
                    {formatCurrency(trip.price, trip.currency)}
                  </p>
                  {(trip.foreigner_price ?? 0) > 0 && (
                    <p>
                      <span className="font-medium">السعر للأجانب:</span>{" "}
                      {formatCurrency(trip.foreigner_price, trip.currency)}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">عدد الاشخاص:</span>{" "}
                    {trip.max_guests}
                  </p>
                  <p>
                    <span className="font-medium">المدة:</span>{" "}
                    {trip.duration ?? 1}{" "}
                    {(trip.duration ?? 1) === 1 ? "ساعة" : "ساعات"}
                  </p>
                  {trip.tour_guide && (
                    <p>
                      <span className="font-medium">المرشد:</span>{" "}
                      {trip.tour_guide.name}
                      {trip.guide_mandatory ? (
                        <span className="text-duck-cyan ms-1">
                          (إلزامي
                          {(trip.guide_price ?? 0) > 0
                            ? ` +${formatCurrency(trip.guide_price, trip.currency)}`
                            : ""}
                          )
                        </span>
                      ) : (trip.guide_price ?? 0) > 0 ? (
                        <span className="text-text-muted ms-1">
                          (اختياري +
                          {formatCurrency(trip.guide_price, trip.currency)})
                        </span>
                      ) : null}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="flex-1 border-duck-cyan text-duck-cyan hover:bg-duck-cyan hover:text-white"
                >
                  <Link href={`/supplier/my-trips/${trip.id}/edit`}>
                    <Pencil className="w-4 h-4 ms-2" />
                    تعديل
                  </Link>
                </Button>
                <AlertDialog
                  open={deleteId === trip.id}
                  onOpenChange={(open) => !open && setDeleteId(null)}
                >
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteId(trip.id)}
                      className="flex-1 border-red-500 text-red-500 hover:bg-red-500! hover:text-white!"
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4 ms-2" />
                      حذف
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                      <AlertDialogDescription>
                        هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الرحلة نهائياً
                        من النظام.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>
                        إلغاء
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(trip.id)}
                        className="bg-red-500 hover:bg-red-600"
                        disabled={isDeleting}
                      >
                        {isDeleting ? "جاري الحذف..." : "حذف"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {trips.length === 0 && (
        <EmptyState
          icon={Ship}
          title="لا توجد رحلات أو جولات حالياً"
          description="أضف رحلة أو جولة لبدء استقبال الحجوزات."
          actionLabel="اضافة رحلة / جولة جديدة"
          onAction={() => {
            window.location.href = "/supplier/my-trips/create"
          }}
        />
      )}
    </div>
  )
}
