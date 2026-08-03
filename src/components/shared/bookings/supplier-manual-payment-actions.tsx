"use client"

import { useState } from "react"
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
import type { Booking } from "@/lib/types"
import { bookingRowId } from "@/lib/booking-utils"
import { CheckCircle, Loader2 } from "lucide-react"

type ManualAction = "confirm" | "refund"

interface SupplierManualPaymentActionsProps {
  booking: Booking
  loadingId: number | null
  onConfirm: (id: number) => Promise<void>
  onRefund: (id: number) => Promise<void>
}

export function SupplierManualPaymentActions({
  booking,
  loadingId,
  onConfirm,
  onRefund,
}: SupplierManualPaymentActionsProps) {
  const rowId = bookingRowId(booking)
  const [pendingAction, setPendingAction] = useState<ManualAction | null>(null)

  if (booking.payment_method !== "MANUAL") return null

  const showConfirm = booking.status === "PENDING"
  const showRefund = booking.status === "CONFIRMED"

  if (!showConfirm && !showRefund) return null

  return (
    <>
      <p className="mb-3 text-sm font-semibold text-duck-navy">
        إجراءات الدفع اليدوي
      </p>
      <div className="flex flex-wrap gap-2">
        {showConfirm && (
          <Button
            type="button"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={loadingId === rowId}
            onClick={() => setPendingAction("confirm")}
          >
            {loadingId === rowId ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <CheckCircle className="size-4" aria-hidden />
            )}
            تأكيد استلام الدفع
          </Button>
        )}
        {showRefund && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={loadingId === rowId}
            onClick={() => setPendingAction("refund")}
          >
            استرداد الدفع
          </Button>
        )}
      </div>

      <AlertDialog
        open={pendingAction != null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null)
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "confirm"
                ? "تأكيد استلام الدفع؟"
                : "استرداد الدفع اليدوي؟"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "confirm"
                ? "سيتم تأكيد الحجز بعد التحقق من استلام الدفع عبر إنستاباي."
                : "سيتم استرداد الدفع اليدوي. لا يمكن التراجع عن هذا الإجراء بسهولة."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={loadingId === rowId}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              className={
                pendingAction === "refund"
                  ? "bg-destructive hover:bg-destructive/90"
                  : undefined
              }
              onClick={(e) => {
                e.preventDefault()
                if (pendingAction === "confirm") {
                  void onConfirm(rowId).finally(() => setPendingAction(null))
                } else if (pendingAction === "refund") {
                  void onRefund(rowId).finally(() => setPendingAction(null))
                }
              }}
              disabled={loadingId === rowId}
            >
              {loadingId === rowId
                ? "جاري…"
                : pendingAction === "confirm"
                  ? "تأكيد الدفع"
                  : "تأكيد الاسترداد"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
