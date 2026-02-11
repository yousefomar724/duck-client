"use client"

import { useState, useEffect } from "react"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import Image from "next/image"
import PageHeader from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import * as destinationsApi from "@/lib/api/destinations"
import { CardGridSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import type { Destination } from "@/lib/types"

export default function AdminDestinations() {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchDestinations()
  }, [])

  const fetchDestinations = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await destinationsApi.getDestinations()

      if (res.error) {
        setError("فشل في تحميل الوجهات")
        return
      }

      setDestinations(res.data || [])
    } catch (err) {
      setError("حدث خطأ أثناء تحميل الوجهات")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      setIsDeleting(true)
      const res = await destinationsApi.deleteDestination(id)

      if (res.error) {
        setError("فشل في حذف الوجهة")
        return
      }

      setDestinations(destinations.filter((d) => d.id !== id))
      setDeleteId(null)
    } catch (err) {
      setError("حدث خطأ أثناء حذف الوجهة")
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="الوجهات">
          <Button disabled>+ اضافة وجهة</Button>
        </PageHeader>
        <CardGridSkeleton count={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="الوجهات">
          <Button>+ اضافة وجهة</Button>
        </PageHeader>
        <ErrorDisplay error={error} onRetry={fetchDestinations} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الوجهات">
        <Button>+ اضافة وجهة</Button>
      </PageHeader>

      {/* Destinations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {destinations.map((destination) => (
          <Card key={destination.id} className="overflow-hidden py-0!">
            <div className="relative h-48 w-full bg-gray-200">
              {destination.image ? (
                <Image
                  src={destination.image}
                  alt={destination.name.ar}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex items-center justify-center h-full text-text-muted">
                  لا توجد صورة
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-text-dark">
                    {destination.name.ar}
                  </h3>
                  <p className="text-sm text-text-muted mt-1 line-clamp-2">
                    {destination.description.ar}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mr-2"
                      disabled={isDeleting}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pencil className="me-2 h-4 w-4" />
                      تعديل
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => setDeleteId(destination.id)}
                    >
                      <Trash2 className="me-2 h-4 w-4" />
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-300">
                <span className="text-sm text-text-muted">عدد الرحلات</span>
                <span className="text-lg font-bold text-duck-cyan">
                  {destination.trip_count || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {destinations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-muted">لا توجد وجهات متاحة</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الوجهة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه الوجهة؟ لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={isDeleting}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "جاري الحذف..." : "حذف"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
