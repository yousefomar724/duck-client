"use client"

import { useCallback, useState } from "react"
import * as bookingsApi from "@/lib/api/bookings"
import { useToast } from "@/lib/stores/toast-store"
import type { Booking } from "@/lib/types"
import { bookingStrings } from "./booking-strings"
import type { BookingActionType } from "./booking-actions"

/**
 * The booking action handler shared by the bookings list and the ops calendar.
 *
 * Extracted from BookingsView because the ops hour panel was passing a stub
 * that only refreshed the list, so cancel / delete / collect-balance appeared
 * in the calendar's detail sheet but silently did nothing.
 *
 * `onDeleted` lets a caller close its detail sheet once the booking is gone;
 * `onRefresh` always runs afterwards so both surfaces re-read the server.
 */
export function useBookingActions({
  onRefresh,
  onDeleted,
}: {
  onRefresh: () => void | Promise<void>
  onDeleted?: () => void
}) {
  const { addToast } = useToast()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const handleAction = useCallback(
    async (
      type: BookingActionType,
      booking: Booking,
      note?: string,
      amount?: number,
    ) => {
      const id = booking.ID
      setLoadingAction(id)
      try {
        switch (type) {
          case "adminCancel": {
            const { error: err } = await bookingsApi.adminCancelBooking(id, note)
            if (err) {
              addToast(err, "error")
              break
            }
            addToast(bookingStrings.adminCancelSuccess, "success")
            break
          }
          case "processRefund": {
            const { data, error: err } = await bookingsApi.processRefund(id, note)
            if (err) {
              addToast(err, "error")
              break
            }
            if (data?.booking_status === "REFUND_FAILED") {
              addToast(bookingStrings.refundFailed, "error")
            } else {
              addToast(bookingStrings.refundProcessed, "success")
            }
            break
          }
          case "confirmPayment": {
            const { error: err } = await bookingsApi.confirmManualPayment(
              id,
              amount,
              note,
            )
            if (err) {
              addToast(err, "error")
              break
            }
            addToast(bookingStrings.paymentConfirmed, "success")
            break
          }
          case "refundPayment": {
            const { error: err } = await bookingsApi.refundManualPayment(id)
            if (err) {
              addToast(err, "error")
              break
            }
            addToast(bookingStrings.paymentRefunded, "success")
            break
          }
          case "collectBalance": {
            const { error: err } = await bookingsApi.collectBalance(id, amount, note)
            if (err) {
              addToast(err, "error")
              break
            }
            addToast(bookingStrings.balanceCollected, "success")
            break
          }
          case "supplierCancel": {
            const { error: err } = await bookingsApi.supplierCancelBooking(id, note)
            if (err) {
              addToast(err, "error")
              break
            }
            addToast(bookingStrings.supplierCancelSuccess, "success")
            break
          }
          case "refundSent": {
            const { error: err } = await bookingsApi.markRefundSent(id, note)
            if (err) {
              addToast(err, "error")
              break
            }
            addToast(bookingStrings.refundSentSuccess, "success")
            break
          }
          case "adminDelete": {
            const { error: err } = await bookingsApi.deleteBooking(id, note)
            if (err) {
              addToast(err, "error")
              break
            }
            addToast(bookingStrings.adminDeleteSuccess, "success")
            onDeleted?.()
            break
          }
        }
      } finally {
        await onRefresh()
        setLoadingAction(null)
      }
    },
    [addToast, onRefresh, onDeleted],
  )

  return { handleAction, loadingAction, setLoadingAction }
}
