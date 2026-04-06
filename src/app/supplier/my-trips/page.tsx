"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Pencil, Trash2 } from "lucide-react"
import PageHeader from "@/components/shared/page-header"
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
import * as tripsApi from "@/lib/api/trips"
import { CardGridSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import { Trip } from "@/lib/types"
import Image from "next/image"

export default function MyTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchTrips = async () => {
    setIsLoading(true)
    setError(null)
    const { data, error: fetchError } = await tripsApi.getMyTrips("ar")
    if (fetchError) {
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

  const handleDelete = async (tripId: number) => {
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
      <div className="p-6">
        <PageHeader title="رحلاتي وجولاتي">
          <Button
            asChild
            className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy"
          >
            <Link href="/supplier/my-trips/create">+ اضافة رحلة / جولة</Link>
          </Button>
        </PageHeader>
        <CardGridSkeleton count={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="رحلاتي وجولاتي">
          <Button
            asChild
            className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy"
          >
            <Link href="/supplier/my-trips/create">+ اضافة رحلة / جولة</Link>
          </Button>
        </PageHeader>
        <ErrorDisplay error={error} onRetry={fetchTrips} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <PageHeader title="رحلاتي وجولاتي">
        <Button
          asChild
          className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy"
        >
          <Link href="/supplier/my-trips/create">+ اضافة رحلة / جولة</Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.map((trip) => {
          let imageUrl: string | null = null
          if (typeof trip.images === "string") {
            imageUrl = trip.images
          } else if (Array.isArray(trip.images) && trip.images.length > 0) {
            imageUrl = trip.images[0]
          } else if (
            trip.images &&
            typeof trip.images === "object" &&
            !Array.isArray(trip.images)
          ) {
            const urls = Object.values(
              trip.images as Record<string, string>,
            ).filter(Boolean)
            imageUrl = urls[0] ?? null
          }
          const fullImageUrl = (() => {
            if (!imageUrl) return null
            if (imageUrl.startsWith("http")) return imageUrl
            const normalized = imageUrl.startsWith("/")
              ? imageUrl
              : `/${imageUrl}`
            const apiUrl =
              process.env.NEXT_PUBLIC_API_URL ||
              "https://duckapi.alefmenu.com/api/v1"
            if (!apiUrl) return normalized
            try {
              const url = new URL(apiUrl)
              if (url.hostname === "localhost" && url.port === "8080") {
                return normalized
              }
              return `${url.origin}${normalized}`
            } catch {
              return normalized
            }
          })()

          return (
            <Card
              key={trip.id}
              className="overflow-hidden py-0! hover:shadow-lg transition-all duration-200 gap-0!"
            >
              <div className="relative h-48 w-full">
                <span
                  className={`absolute top-2 start-2 z-10 text-xs font-medium px-2 py-0.5 rounded-full ${
                    trip.is_tour
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {trip.is_tour ? "جولة" : "رحلة"}
                </span>
                {fullImageUrl ? (
                  fullImageUrl.endsWith(".mp4") ? (
                    <video
                      src={fullImageUrl}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      autoPlay
                    />
                  ) : (
                    <Image
                      src={fullImageUrl}
                      fill
                      alt={
                        typeof trip.name === "string"
                          ? trip.name
                          : trip.name?.ar || "Trip"
                      }
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">لا توجد صورة</span>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-bold text-lg mb-2 text-duck-navy">
                  {typeof trip.name === "string"
                    ? trip.name
                    : trip.name?.ar || "بدون عنوان"}
                </h3>
                <div className="space-y-1 text-sm text-text-body">
                  {trip.destination && (
                    <p>
                      <span className="font-medium">الوجهة:</span> نعم
                    </p>
                  )}
                  {trip.location && (
                    <p>
                      <span className="font-medium">الموقع:</span> نعم
                    </p>
                  )}
                  <p>
                    <span className="font-medium">السعر:</span>{" "}
                    {formatCurrency(trip.price, trip.currency)}
                  </p>
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
        <div className="text-center py-12">
          <p className="text-text-muted mb-4">لا توجد رحلات أو جولات حالياً</p>
          <Button
            asChild
            className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy"
          >
            <Link href="/supplier/my-trips/create">
              اضافة رحلة / جولة جديدة
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
