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
import { useToast } from "@/lib/stores/toast-store"
import Footer from "@/components/landing/Footer"
import { useTranslations, useLocale } from "next-intl"
import { buildWhatsAppHref } from "@/lib/support-contact"

function canCancelBooking(status: string): boolean {
  return status === "CONFIRMED" || status === "SUCCESS" || status === "PAID"
}

function MyBookingsContent() {
  const { addToast } = useToast()
  const t = useTranslations("myBookings")
  const locale = useLocale()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const resourceLabels: Record<string, string> = {
    kayak: t("resourceKayak"),
    water_cycle: t("resourceWaterCycle"),
    sup: t("resourceSup"),
  }

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
    addToast(t("cancelSuccess"), "success")
    await load()
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 md:pt-36 pb-16 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <PageHeader title={t("title")} />
          <TableSkeleton rows={5} columns={8} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 md:pt-36 pb-16 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <PageHeader title={t("title")} />
          <ErrorDisplay error={error} onRetry={load} />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen pt-24 md:pt-36 pb-16 px-4">
        <div
          className="max-w-5xl mx-auto space-y-6"
          dir={locale === "ar" ? "rtl" : "ltr"}
        >
          <PageHeader title={t("title")} />

          <div className="rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{t("colId")}</TableHead>
                  <TableHead className="text-right">{t("colType")}</TableHead>
                  <TableHead className="text-right">{t("colTrip")}</TableHead>
                  <TableHead className="text-right">{t("colDate")}</TableHead>
                  <TableHead className="text-right">
                    {t("colResource")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("colQuantity")}
                  </TableHead>
                  <TableHead className="text-right">{t("colAmount")}</TableHead>
                  <TableHead className="text-right">{t("colStatus")}</TableHead>
                  <TableHead className="text-right">
                    {t("colActions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-12! text-text-muted"
                    >
                      {t("noBookings")}{" "}
                      <Link href="/book" className="text-duck-cyan underline">
                        {t("bookTrip")}
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((b) => {
                    const tripName =
                      typeof b.trip?.name === "string"
                        ? b.trip.name
                        : (b.trip?.name?.ar ?? "—")
                    const rt = b.resource_type
                      ? (resourceLabels[b.resource_type] ?? b.resource_type)
                      : "—"
                    return (
                      <TableRow key={b.ID}>
                        <TableCell className="font-medium">#{b.ID}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                              b.trip?.is_tour
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {b.trip?.is_tour ? t("tour") : t("trip")}
                          </span>
                        </TableCell>
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
                        <TableCell className="max-w-[14rem] align-top">
                          <div className="space-y-2">
                            <StatusBadge
                              status={b.status as BookingStatus}
                              type="booking"
                            />
                            {b.status === "REFUND_PENDING" && (
                              <p className="text-xs text-text-muted leading-snug">
                                {t("refundPendingNote")}{" "}
                                <a
                                  href={buildWhatsAppHref(
                                    t("refundWhatsAppPrefillPending", {
                                      id: String(b.ID),
                                    }),
                                  )}
                                  className="text-duck-cyan underline font-medium"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {t("refundContactWhatsApp")}
                                </a>
                              </p>
                            )}
                            {b.status === "REFUND_FAILED" && (
                              <p className="text-xs text-text-muted leading-snug">
                                {t("refundFailedNote")}{" "}
                                <a
                                  href={buildWhatsAppHref(
                                    t("refundWhatsAppPrefillFailed", {
                                      id: String(b.ID),
                                    }),
                                  )}
                                  className="text-duck-cyan underline font-medium"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {t("refundContactWhatsApp")}
                                </a>
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {canCancelBooking(b.status) ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => setCancelId(b.ID)}
                            >
                              {t("cancel")}
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
        <AlertDialogContent dir={locale === "ar" ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cancelDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={cancelling}>
              {t("cancelBack")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmCancel()
              }}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelling ? t("cancelling") : t("cancelConfirm")}
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
