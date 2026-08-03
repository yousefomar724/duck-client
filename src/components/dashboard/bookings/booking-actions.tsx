"use client"

import { useState } from "react"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { canAdminCancelBooking } from "@/lib/bookings/status"
import type { Booking } from "@/lib/types"
import { bookingStrings } from "./booking-strings"
import {
  CheckCircle,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  XCircle,
} from "lucide-react"

export type BookingActionType =
  | "adminCancel"
  | "processRefund"
  | "confirmPayment"
  | "refundPayment"

interface BookingActionsProps {
  booking: Booking
  role: "admin" | "supplier"
  loadingAction?: string | null
  variant?: "inline" | "dropdown" | "footer"
  onAction: (type: BookingActionType, booking: Booking, note?: string) => void
}

export function hasBookingActions(
  booking: Booking,
  role: "admin" | "supplier",
): boolean {
  const adminCancelEnabled = canAdminCancelBooking(booking.status)
  const refundEnabled = booking.status === "REFUND_PENDING"
  const confirmPaymentEnabled =
    role === "supplier" &&
    booking.payment_method === "MANUAL" &&
    booking.status === "PENDING"
  const refundPaymentEnabled =
    role === "supplier" &&
    booking.payment_method === "MANUAL" &&
    booking.status === "CONFIRMED"

  return (
    (role === "admin" && (adminCancelEnabled || refundEnabled)) ||
    confirmPaymentEnabled ||
    refundPaymentEnabled
  )
}

export function BookingActions({
  booking,
  role,
  loadingAction,
  variant = "inline",
  onAction,
}: BookingActionsProps) {
  const [dialog, setDialog] = useState<BookingActionType | null>(null)
  const [note, setNote] = useState("")
  const rowId = booking.ID
  const isLoading = loadingAction === rowId

  const adminCancelEnabled = canAdminCancelBooking(booking.status)
  const refundEnabled = booking.status === "REFUND_PENDING"
  const confirmPaymentEnabled =
    role === "supplier" &&
    booking.payment_method === "MANUAL" &&
    booking.status === "PENDING"
  const refundPaymentEnabled =
    role === "supplier" &&
    booking.payment_method === "MANUAL" &&
    booking.status === "CONFIRMED"

  const hasAnyAction = hasBookingActions(booking, role)

  if (!hasAnyAction) return null

  const openDialog = (type: BookingActionType) => {
    setNote("")
    setDialog(type)
  }

  const confirm = () => {
    if (!dialog) return
    onAction(dialog, booking, note.trim() || undefined)
    setDialog(null)
    setNote("")
  }

  const dialogConfig: Record<
    BookingActionType,
    { title: string; description: string; confirmLabel: string; variant?: "destructive" | "default" }
  > = {
    adminCancel: {
      title: bookingStrings.adminCancelTitle,
      description: bookingStrings.adminCancelDescription,
      confirmLabel: bookingStrings.adminCancel,
      variant: "destructive",
    },
    processRefund: {
      title: bookingStrings.processRefundTitle,
      description: bookingStrings.processRefundDescription,
      confirmLabel: bookingStrings.processRefund,
    },
    confirmPayment: {
      title: bookingStrings.confirmPaymentTitle,
      description: bookingStrings.confirmPaymentDescription,
      confirmLabel: bookingStrings.confirmPayment,
    },
    refundPayment: {
      title: bookingStrings.refundPaymentTitle,
      description: bookingStrings.refundPaymentDescription,
      confirmLabel: bookingStrings.refundPayment,
      variant: "destructive",
    },
  }

  const actionButtons = (
    <>
      {role === "admin" && adminCancelEnabled && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-amber-600/40 text-amber-900 hover:bg-amber-50"
          disabled={isLoading}
          onClick={() => openDialog("adminCancel")}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <XCircle className="size-4" />
          )}
          {bookingStrings.adminCancel}
        </Button>
      )}
      {role === "admin" && refundEnabled && (
        <Button
          type="button"
          size="sm"
          disabled={isLoading}
          onClick={() => openDialog("processRefund")}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {bookingStrings.processRefund}
        </Button>
      )}
      {confirmPaymentEnabled && (
        <Button
          type="button"
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={isLoading}
          onClick={() => openDialog("confirmPayment")}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle className="size-4" />
          )}
          {bookingStrings.confirmPayment}
        </Button>
      )}
      {refundPaymentEnabled && (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={isLoading}
          onClick={() => openDialog("refundPayment")}
        >
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          {bookingStrings.refundPayment}
        </Button>
      )}
    </>
  )

  const dropdownItems = (
    <>
      {role === "admin" && adminCancelEnabled && (
        <DropdownMenuItem onClick={() => openDialog("adminCancel")}>
          {bookingStrings.adminCancel}
        </DropdownMenuItem>
      )}
      {role === "admin" && refundEnabled && (
        <DropdownMenuItem onClick={() => openDialog("processRefund")}>
          {bookingStrings.processRefund}
        </DropdownMenuItem>
      )}
      {confirmPaymentEnabled && (
        <DropdownMenuItem onClick={() => openDialog("confirmPayment")}>
          {bookingStrings.confirmPayment}
        </DropdownMenuItem>
      )}
      {refundPaymentEnabled && (
        <DropdownMenuItem onClick={() => openDialog("refundPayment")}>
          {bookingStrings.refundPayment}
        </DropdownMenuItem>
      )}
    </>
  )

  return (
    <>
      {variant === "dropdown" ? (
        <div data-prevent-row-click>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">{bookingStrings.actions}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">{dropdownItems}</DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div
          className={
            variant === "footer"
              ? "flex flex-wrap gap-2"
              : "flex flex-wrap gap-2"
          }
          data-prevent-row-click
        >
          {actionButtons}
        </div>
      )}

      <AlertDialog
        open={dialog != null}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null)
            setNote("")
          }
        }}
      >
        <AlertDialogContent>
          {dialog && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{dialogConfig[dialog].title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {dialogConfig[dialog].description}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="action-note">
                  {dialog === "processRefund"
                    ? bookingStrings.reasonOptional
                    : bookingStrings.noteOptional}
                </Label>
                <Input
                  id="action-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="مثال: طلب العميل"
                />
              </div>
              <AlertDialogFooter className="gap-2 sm:gap-0">
                <AlertDialogCancel disabled={isLoading}>
                  {bookingStrings.cancel}
                </AlertDialogCancel>
                <AlertDialogAction
                  className={
                    dialogConfig[dialog].variant === "destructive"
                      ? "bg-destructive hover:bg-destructive/90"
                      : undefined
                  }
                  onClick={(e) => {
                    e.preventDefault()
                    confirm()
                  }}
                  disabled={isLoading}
                >
                  {isLoading
                    ? bookingStrings.confirming
                    : dialogConfig[dialog].confirmLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
