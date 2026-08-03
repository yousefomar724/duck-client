"use client"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Booking } from "@/lib/types"
import { bookingRowId, canAdminCancelBooking } from "@/lib/booking-utils"

interface AdminBookingInlineActionsProps {
  booking: Booking
  onCancel: (id: number) => void
  onRefund: (id: number) => void
}

export function AdminBookingInlineActions({
  booking,
  onCancel,
  onRefund,
}: AdminBookingInlineActionsProps) {
  const rowId = bookingRowId(booking)

  return (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {canAdminCancelBooking(booking.status) && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full border-amber-600/40 text-amber-900 hover:bg-amber-50 sm:w-auto"
          onClick={() => onCancel(rowId)}
        >
          إلغاء من الإدارة
        </Button>
      )}
      {booking.status === "REFUND_PENDING" && (
        <Button
          type="button"
          size="sm"
          className="w-full shrink-0 sm:w-auto"
          onClick={() => onRefund(rowId)}
        >
          معالجة الاسترداد
        </Button>
      )}
    </div>
  )
}

interface AdminBookingDialogsProps {
  adminCancelId: number | null
  adminCancelNote: string
  adminCancelLoading: boolean
  onAdminCancelNoteChange: (value: string) => void
  onAdminCancelOpenChange: (open: boolean) => void
  onConfirmAdminCancel: () => void
  refundId: number | null
  refundReason: string
  refundLoading: boolean
  onRefundReasonChange: (value: string) => void
  onRefundOpenChange: (open: boolean) => void
  onConfirmRefund: () => void
}

export function AdminBookingDialogs({
  adminCancelId,
  adminCancelNote,
  adminCancelLoading,
  onAdminCancelNoteChange,
  onAdminCancelOpenChange,
  onConfirmAdminCancel,
  refundId,
  refundReason,
  refundLoading,
  onRefundReasonChange,
  onRefundOpenChange,
  onConfirmRefund,
}: AdminBookingDialogsProps) {
  return (
    <>
      <AlertDialog
        open={adminCancelId != null}
        onOpenChange={onAdminCancelOpenChange}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء الحجز من الإدارة؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيصبح الحجز «في انتظار الاسترداد» دون شرط الـ 24 ساعة. يمكنك بعدها
              تنفيذ الاسترداد عبر الدفع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="admin-cancel-note">ملاحظة (اختياري)</Label>
            <Input
              id="admin-cancel-note"
              value={adminCancelNote}
              onChange={(e) => onAdminCancelNoteChange(e.target.value)}
              placeholder="مثال: طقس، طلب العميل عبر واتساب…"
            />
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={adminCancelLoading}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-700 hover:bg-amber-800"
              onClick={(e) => {
                e.preventDefault()
                void onConfirmAdminCancel()
              }}
              disabled={adminCancelLoading}
            >
              {adminCancelLoading ? "جاري…" : "تأكيد الإلغاء"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={refundId != null} onOpenChange={onRefundOpenChange}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>معالجة الاسترداد</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إرسال طلب الاسترداد إلى بوابة الدفع. يمكنك إضافة سبب اختياري.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="refund-reason">السبب (اختياري)</Label>
            <Input
              id="refund-reason"
              value={refundReason}
              onChange={(e) => onRefundReasonChange(e.target.value)}
              placeholder="مثال: طلب العميل…"
            />
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={refundLoading}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void onConfirmRefund()
              }}
              disabled={refundLoading}
            >
              {refundLoading ? "جاري…" : "تأكيد الاسترداد"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
