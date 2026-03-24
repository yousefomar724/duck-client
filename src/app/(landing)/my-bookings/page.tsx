"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/shared/protected-route"
import PageHeader from "@/components/shared/page-header"
import StatusBadge from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import * as bookingsApi from "@/lib/api/bookings"
import { formatCurrency, formatDateTime } from "@/lib/constants"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import type { Booking, BookingStatus } from "@/lib/types"
import { useToast } from "@/lib/toast/toast-context"
import Footer from "@/components/landing/Footer"

const resourceLabels: Record<string, string> = {
  kayak: "كاياك",
  water_cycle: "دراجة مائية",
  sup: "سب",
}

function canCancelBooking(status: string): boolean {
  return status === "CONFIRMED" || status === "SUCCESS" || status === "PAID"
}

function MyBookingsContent() {
  const { addToast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await bookingsApi.getUserBookings()
    if (err) setError(err)
    else setBookings(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      void load()
    }, 0)
    return () => clearTimeout(t)
  }, [load])

  const confirmCancel = async () => {
    if (cancelId == null) return
    setCancelling(true)
    const { error: err } = await bookingsApi.cancelBooking(cancelId)
    setCancelling(false)
    setCancelId(null)
    if (err) {
      addToast(err, "error")
      return
    }
    addToast("تم إلغاء الحجز وطلب الاسترداد.", "success")
    await load()
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <PageHeader title="حجوزاتي" />
          <TableSkeleton rows={5} columns={8} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <PageHeader title="حجوزاتي" />
          <ErrorDisplay error={error} onRetry={load} />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
          <PageHeader title="حجوزاتي" />

          <div className="rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">#</TableHead>
                  <TableHead className="text-right">الرحلة</TableHead>
                  <TableHead className="text-right">تاريخ الحجز</TableHead>
                  <TableHead className="text-right">المعدّات</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-text-muted">
                      لا توجد حجوزات بعد.{" "}
                      <Link href="/book" className="text-duck-cyan underline">
                        احجز رحلة
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((b) => {
                    const tripName =
                      typeof b.trip?.name === "string"
                        ? b.trip.name
                        : b.trip?.name?.ar ?? "—"
                    const rt = b.resource_type
                      ? resourceLabels[b.resource_type] ?? b.resource_type
                      : "—"
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">#{b.id}</TableCell>
                        <TableCell>{tripName}</TableCell>
                        <TableCell className="text-sm text-text-muted">
                          {b.booking_date
                            ? formatDateTime(b.booking_date)
                            : "—"}
                        </TableCell>
                        <TableCell>{rt}</TableCell>
                        <TableCell>{b.quantity ?? "—"}</TableCell>
                        <TableCell>
                          {formatCurrency(b.amount, b.currency)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={b.status as BookingStatus}
                            type="booking"
                          />
                        </TableCell>
                        <TableCell>
                          {canCancelBooking(b.status) ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => setCancelId(b.id)}
                            >
                              إلغاء
                            </Button>
                          ) : (
                            <span className="text-text-muted text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AlertDialog
        open={cancelId != null}
        onOpenChange={(open) => !open && setCancelId(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء الحجز؟</AlertDialogTitle>
            <AlertDialogDescription>
              يُسمح بالإلغاء قبل 24 ساعة من موعد الرحلة. سيتم طلب استرداد المبلغ
              من الإدارة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={cancelling}>تراجع</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmCancel()
              }}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelling ? "جاري..." : "تأكيد الإلغاء"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </>
  )
}

export default function MyBookingsPage() {
  return (
    <ProtectedRoute allowedRoles={[0, 1, 2]}>
      <MyBookingsContent />
    </ProtectedRoute>
  )
}
