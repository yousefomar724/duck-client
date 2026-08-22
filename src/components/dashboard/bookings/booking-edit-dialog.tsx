"use client"

import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod/v3"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { bookingStrings } from "./booking-strings"
import { calculateBookingTotal } from "@/lib/booking/pricing"
import { isBookingTimeValid } from "@/lib/booking/schedule"
import { amountPaid } from "@/lib/bookings/payment"
import { guestAgeBreakdown } from "@/lib/bookings/guests"
import { formatCurrency } from "@/lib/constants"
import { siteMinutesOfDay, siteWallTimeToUtc, toSiteYmd } from "@/lib/time"
import type { Booking, Trip } from "@/lib/types"
import type { UpdateBookingRequest } from "@/lib/api/bookings"
import { Loader2 } from "lucide-react"

const DATETIME_LOCAL_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/

const editSchema = z
  .object({
    full_name: z.string().min(2),
    phone_number: z.string().min(1),
    booking_date: z.string().min(1),
    resource_type: z.enum(["kayak", "water_cycle", "sup"]),
    local_guests: z.coerce.number().int().min(0),
    foreigner_guests: z.coerce.number().int().min(0),
    adults: z.coerce.number().int().min(1),
    kids_1_6: z.coerce.number().int().min(0),
    kids_7_12: z.coerce.number().int().min(0),
    duration: z.coerce.number().int().min(1).optional(),
    wants_guide: z.boolean(),
    amount_override: z.coerce.number().positive().optional().or(z.literal("")),
    note: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const match = DATETIME_LOCAL_RE.exec(data.booking_date)
    if (!match) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: bookingStrings.bookingTimeRange,
        path: ["booking_date"],
      })
      return
    }
    const [, ymd, hour, minute] = match
    const instant = siteWallTimeToUtc(ymd, Number(hour), Number(minute))
    if (!isBookingTimeValid(instant)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: bookingStrings.bookingTimeRange,
        path: ["booking_date"],
      })
    }
  })

type EditFormValues = z.infer<typeof editSchema>

interface BookingEditDialogProps {
  booking: Booking | null
  trip?: Trip
  role: "admin" | "supplier"
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (id: string, data: UpdateBookingRequest) => Promise<void>
  loading?: boolean
}

function toLocalDatetimeValue(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  const ymd = toSiteYmd(d)
  const minutes = siteMinutesOfDay(d)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${ymd}T${pad(hours)}:${pad(mins)}`
}

function cairoIsoFromDatetimeLocal(value: string): string {
  const match = DATETIME_LOCAL_RE.exec(value)
  if (!match) return new Date(value).toISOString()
  const [, ymd, hour, minute] = match
  return siteWallTimeToUtc(ymd, Number(hour), Number(minute)).toISOString()
}

function previewAmount(
  booking: Booking,
  trip: Trip | undefined,
  values: EditFormValues,
  amountOverride?: number,
): number {
  if (amountOverride && amountOverride > 0) return amountOverride

  const snap = booking.pricing_snapshot
  const previewTrip = {
    price: snap?.price ?? trip?.price ?? 0,
    foreigner_price: snap?.foreigner_price ?? trip?.foreigner_price ?? 0,
    is_tour: trip?.is_tour ?? false,
  }

  const local = values.local_guests
  const foreigner = values.foreigner_guests
  const totalGuests = local + foreigner
  const guestMix =
    local > 0 && foreigner > 0 ? "mixed" : foreigner > 0 ? "foreigner" : "local"

  let total = calculateBookingTotal({
    trip: previewTrip,
    guestMix,
    guests: totalGuests,
    localGuests: local,
    foreignerGuests: foreigner,
    duration: values.duration ?? booking.duration ?? 1,
  })

  if (values.wants_guide) {
    total += snap?.guide_price ?? trip?.guide_price ?? 0
  }

  return total
}

export function BookingEditDialog({
  booking,
  trip,
  role,
  open,
  onOpenChange,
  onSubmit,
  loading,
}: BookingEditDialogProps) {
  const locked = Boolean(booking?.pricing_locked) && role !== "admin"

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      full_name: "",
      phone_number: "",
      booking_date: "",
      resource_type: "kayak",
      local_guests: 0,
      foreigner_guests: 0,
      adults: 1,
      kids_1_6: 0,
      kids_7_12: 0,
      duration: 1,
      wants_guide: false,
      amount_override: "",
      note: "",
    },
  })

  useEffect(() => {
    if (!booking || !open) return
    form.reset({
      full_name: booking.full_name,
      phone_number: booking.phone_number,
      booking_date: toLocalDatetimeValue(booking.booking_date),
      resource_type: (booking.resource_type as EditFormValues["resource_type"]) ?? "kayak",
      local_guests: booking.local_guests ?? 0,
      foreigner_guests: booking.foreigner_guests ?? 0,
      adults: guestAgeBreakdown(booking).adults,
      kids_1_6: guestAgeBreakdown(booking).kids_1_6,
      kids_7_12: guestAgeBreakdown(booking).kids_7_12,
      duration: booking.duration && booking.duration > 0 ? booking.duration : 1,
      wants_guide: booking.wants_guide ?? false,
      amount_override: "",
      note: "",
    })
  }, [booking, open, form])

  const values = form.watch()
  const amountOverride =
    values.amount_override === "" || values.amount_override == null
      ? undefined
      : Number(values.amount_override)

  const newAmount = useMemo(() => {
    if (!booking) return 0
    if (locked) return booking.amount
    return previewAmount(booking, trip, values, amountOverride)
  }, [booking, trip, values, amountOverride, locked])

  const paid = booking ? amountPaid(booking) : 0
  const delta = booking ? newAmount - booking.amount : 0
  const refundOwedPreview = Math.max(0, paid - newAmount)
  const balanceDue = Math.max(0, newAmount - paid)

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!booking) return
    const kids = data.kids_1_6 + data.kids_7_12
    if (data.adults + kids !== data.local_guests + data.foreigner_guests) {
      form.setError("adults", {
        message: bookingStrings.guestBreakdownMismatch,
      })
      return
    }
    const payload: UpdateBookingRequest = {
      full_name: data.full_name.trim(),
      phone_number: data.phone_number.trim(),
      booking_date: cairoIsoFromDatetimeLocal(data.booking_date),
      resource_type: data.resource_type,
      local_guests: data.local_guests,
      foreigner_guests: data.foreigner_guests,
      adults: data.adults,
      kids_1_6: data.kids_1_6,
      kids_7_12: data.kids_7_12,
      quantity: data.local_guests + data.foreigner_guests,
      wants_guide: data.wants_guide,
      note: data.note?.trim() || undefined,
    }
    if (trip?.is_tour) {
      payload.duration = data.duration
    }
    if (role === "admin" && amountOverride && amountOverride > 0) {
      payload.amount_override = amountOverride
    }
    await onSubmit(booking.ID, payload)
  })

  if (!booking) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bookingStrings.editBookingTitle}</DialogTitle>
          <DialogDescription>
            {locked
              ? bookingStrings.editBookingLocked
              : bookingStrings.editBookingDescription}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-full_name">{bookingStrings.customer}</Label>
              <Input id="edit-full_name" {...form.register("full_name")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-phone">{bookingStrings.phone}</Label>
              <Input id="edit-phone" dir="ltr" {...form.register("phone_number")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-date">{bookingStrings.bookingDate}</Label>
              <Input
                id="edit-date"
                type="datetime-local"
                {...form.register("booking_date")}
              />
              {form.formState.errors.booking_date?.message ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.booking_date.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>{bookingStrings.equipment}</Label>
              <Select
                value={values.resource_type}
                onValueChange={(v) =>
                  form.setValue("resource_type", v as EditFormValues["resource_type"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kayak">كاياك</SelectItem>
                  <SelectItem value="water_cycle">دراجة مائية</SelectItem>
                  <SelectItem value="sup">التجديف وقوفاً</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-local">{bookingStrings.guests} (محلي)</Label>
              <Input id="edit-local" type="number" min={0} {...form.register("local_guests")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-foreigner">أجنبي</Label>
              <Input
                id="edit-foreigner"
                type="number"
                min={0}
                {...form.register("foreigner_guests")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-adults">{bookingStrings.adults}</Label>
              <Input id="edit-adults" type="number" min={1} {...form.register("adults")} />
              {form.formState.errors.adults?.message ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.adults.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-kids-16">{bookingStrings.kids1to6}</Label>
              <Input
                id="edit-kids-16"
                type="number"
                min={0}
                {...form.register("kids_1_6")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-kids-712">{bookingStrings.kids7to12}</Label>
              <Input
                id="edit-kids-712"
                type="number"
                min={0}
                {...form.register("kids_7_12")}
              />
            </div>
            {trip?.is_tour && (
              <div className="space-y-2">
                <Label htmlFor="edit-duration">{bookingStrings.durationHours}</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  min={1}
                  disabled={locked}
                  {...form.register("duration")}
                />
              </div>
            )}
            {role === "admin" && booking.pricing_locked && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-override">{bookingStrings.amountOverride}</Label>
                <Input
                  id="edit-override"
                  type="number"
                  min={1}
                  placeholder={String(booking.amount)}
                  {...form.register("amount_override")}
                />
              </div>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-note">{bookingStrings.note}</Label>
              <Input id="edit-note" {...form.register("note")} />
            </div>
          </div>

          {!locked && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span>{bookingStrings.priceBefore}</span>
                <span>{formatCurrency(booking.amount, booking.currency)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>{bookingStrings.priceAfter}</span>
                <span>{formatCurrency(newAmount, booking.currency)}</span>
              </div>
              {delta !== 0 && (
                <div className="flex justify-between text-text-muted">
                  <span>{bookingStrings.priceDelta}</span>
                  <span>
                    {delta > 0 ? "+" : ""}
                    {formatCurrency(delta, booking.currency)}
                  </span>
                </div>
              )}
              {refundOwedPreview > 0 && (
                <div className="flex justify-between text-rose-700 font-medium">
                  <span>{bookingStrings.refundOwedPreview}</span>
                  <span>{formatCurrency(refundOwedPreview, booking.currency)}</span>
                </div>
              )}
              {balanceDue > 0 && paid > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>{bookingStrings.balanceDuePreview}</span>
                  <span>{formatCurrency(balanceDue, booking.currency)}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {bookingStrings.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {bookingStrings.saveChanges}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
