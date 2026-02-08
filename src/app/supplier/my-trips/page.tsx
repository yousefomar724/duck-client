"use client"

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
import { mockTrips } from "@/lib/mock-data"
import { formatCurrency } from "@/lib/constants"

export default function MyTripsPage() {
  // Filter trips for supplier_id = 1
  const supplierTrips = mockTrips.filter((trip) => trip.supplier_id === 1)

  const handleDelete = (tripId: number) => {
    // In a real app, this would call an API to delete the trip
    console.log("Delete trip:", tripId)
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
        {supplierTrips.map((trip) => (
          <Card key={trip.id} className="overflow-hidden">
            <div className="relative h-48 w-full">
              {trip.images[0] ? (
                trip.images[0].endsWith(".mp4") ? (
                  <video
                    src={trip.images[0]}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    autoPlay
                  />
                ) : (
                  <Image
                    src={trip.images[0]}
                    alt={trip.name.ar}
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
                {trip.name.ar}
              </h3>
              <div className="space-y-1 text-sm text-text-body">
                <p>
                  <span className="font-medium">الوجهة:</span>{" "}
                  {trip.destination}
                </p>
                <p>
                  <span className="font-medium">الموقع:</span> {trip.location}
                </p>
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
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
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(trip.id)}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      حذف
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        ))}
      </div>

      {supplierTrips.length === 0 && (
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
