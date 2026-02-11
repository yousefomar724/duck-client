"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
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
    fetchTrips()
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
        <PageHeader title="رحلاتي">
          <Button
            asChild
            className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy"
          >
            <Link href="/supplier/my-trips/create">+ اضافة رحلة</Link>
          </Button>
        </PageHeader>
        <CardGridSkeleton count={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="رحلاتي">
          <Button
            asChild
            className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy"
          >
            <Link href="/supplier/my-trips/create">+ اضافة رحلة</Link>
          </Button>
        </PageHeader>
        <ErrorDisplay error={error} onRetry={fetchTrips} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <PageHeader title="رحلاتي">
        <Button
          asChild
          className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy"
        >
          <Link href="/supplier/my-trips/create">+ اضافة رحلة</Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.map((trip) => {
          const imageUrl = typeof trip.images === 'string' ? trip.images :
                           Array.isArray(trip.images) && trip.images.length > 0 ?
                           trip.images[0] : null

          return (
            <Card key={trip.id} className="overflow-hidden py-0!">
              <div className="relative h-48 w-full">
                {imageUrl ? (
                  imageUrl.endsWith(".mp4") ? (
                    <video
                      src={imageUrl}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      autoPlay
                    />
                  ) : (
                    <Image
                      src={imageUrl}
                      alt={typeof trip.name === 'string' ? trip.name : trip.name?.ar || 'Trip'}
                      fill
                      className="object-cover"
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
                  {typeof trip.name === 'string' ? trip.name : trip.name?.ar || 'بدون عنوان'}
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
                    <span className="font-medium">عدد الضيوف:</span>{" "}
                    {trip.max_guests}
                  </p>
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
                <AlertDialog open={deleteId === trip.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteId(trip.id)}
                      className="flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
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
                      <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
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
          <p className="text-text-muted mb-4">لا توجد رحلات حالياً</p>
          <Button
            asChild
            className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy"
          >
            <Link href="/supplier/my-trips/create">اضافة رحلة جديدة</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
