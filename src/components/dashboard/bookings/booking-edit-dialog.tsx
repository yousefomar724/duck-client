"use client"

import { useEffect, useMemo, useState } from "react"
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
import {
  applyDiscount,
  isManualDiscount,
  MAX_PERCENTAGE_DISCOUNT,
  type DiscountRule,
} from "@/lib/booking/discount"
import { isBookingTimeValid } from "@/lib/booking/schedule"
import { amountPaid } from "@/lib/bookings/payment"
import { guestAgeBreakdown } from "@/lib/bookings/guests"
import { formatCurrency } from "@/lib/constants"
import { isEndedBookingCorrection, localizedTripName } from "@/lib/bookings/status"
import { discountDisplayName } from "./booking-discount-note"
import * as tripsApi from "@/lib/api/trips"
import { siteMinutesOfDay, siteWallTimeToUtc, toSiteYmd } from "@/lib/time"
import type { Booking, Trip } from "@/lib/types"
import type { UpdateBookingRequest } from "@/lib/api/bookings"
import { Loader2 } from "lucide-react"

const DATETIME_LOCAL_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/

const editSchema = z
  .object({
    trip_id: z.string().min(1),
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
    discount_mode: z.enum(["none", "code", "manual"]),
    discount_code: z.string().optional(),
    manual_type: z.enum(["percentage", "fixed"]),
    manual_value: z.string().optional(),
    manual_funded_by: z.enum(["platform", "supplier"]),
    manual_reason: z.string().max(200).optional(),
    note: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.discount_mode === "manual") {
      const value = Number(data.manual_value)
      if (!Number.isFinite(value) || value <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: bookingStrings.manualDiscountPositive,
          path: ["manual_value"],
        })
      } else if (data.manual_type === "percentage" && value > MAX_PERCENTAGE_DISCOUNT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: bookingStrings.manualDiscountPercentRange,
          path: ["manual_value"],
        })
      }
    }
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

type DiscountChange = "keep" | "remove" | "apply" | "manual"

type DiscountFields = Pick<
  EditFormValues,
  | "discount_mode"
  | "discount_code"
  | "manual_type"
  | "manual_value"
  | "manual_funded_by"
  | "manual_reason"
>

function manualRuleOf(values: DiscountFields): DiscountRule | null {
  const value = Number(values.manual_value)
  if (!Number.isFinite(value) || value <= 0) return null
  return { type: values.manual_type, value, max_discount: null }
}

/**
 * Mirrors the server: retyping the booking's own code keeps it, a blank field
 * or "no discount" removes it, and an unchanged manual rule keeps it.
 */
function discountChangeOf(booking: Booking, values: DiscountFields): DiscountChange {
  const current = booking.discount
  if (values.discount_mode === "none") return current ? "remove" : "keep"
  if (values.discount_mode === "manual") {
    const rule = manualRuleOf(values)
    if (
      current &&
      isManualDiscount(current) &&
      rule &&
      current.type === rule.type &&
      current.value === rule.value &&
      current.funded_by === values.manual_funded_by &&
      (current.reason ?? "") === (values.manual_reason ?? "").trim()
    ) {
      return "keep"
    }
    return "manual"
  }
  const code = (values.discount_code ?? "").trim().toUpperCase()
  if (current && !isManualDiscount(current) && code === current.code) return "keep"
  if (!code) return current ? "remove" : "keep"
  return "apply"
}

function previewAmount(
  booking: Booking,
  trip: Trip | undefined,
  values: EditFormValues,
  amountOverride?: number,
): number {
  if (amountOverride && amountOverride > 0) return amountOverride

  // Switching trips reprices from the new trip, mirroring the server.
  const snap = values.trip_id !== booking.trip_id ? undefined : booking.pricing_snapshot
  const previewTrip = {
    price: snap?.price ?? trip?.price ?? 0,
    foreigner_price: snap?.foreigner_price ?? trip?.foreigner_price ?? 0,
    is_tour: trip?.is_tour ?? false,
  }

  // watch() returns raw input strings; zod only coerces on submit.
  const local = Number(values.local_guests) || 0
  const foreigner = Number(values.foreigner_guests) || 0
  const totalGuests = local + foreigner
  const guestMix =
    local > 0 && foreigner > 0 ? "mixed" : foreigner > 0 ? "foreigner" : "local"

  let total = calculateBookingTotal({
    trip: previewTrip,
    guestMix,
    guests: totalGuests,
    localGuests: local,
    foreignerGuests: foreigner,
    duration: Number(values.duration) || booking.duration || 1,
  })

  if (values.wants_guide || trip?.guide_mandatory) {
    total += snap?.guide_price ?? trip?.guide_price ?? 0
  }

  // A new code is checked and priced by the server on save, so the preview
  // shows the price before it. A manual rule is priced here the same way.
  const change = discountChangeOf(booking, values)
  if (booking.discount && change === "keep") {
    return applyDiscount(total, booking.discount).total
  }
  if (change === "manual") {
    const rule = manualRuleOf(values)
    if (rule) return applyDiscount(total, rule).total
  }

  return total
}

function discountDefaults(booking: Booking, role: "admin" | "supplier"): DiscountFields {
  const discount = booking.discount
  const manual = isManualDiscount(discount)
  return {
    discount_mode: !discount ? "none" : manual ? "manual" : "code",
    discount_code: discount && !manual ? discount.code : "",
    manual_type: manual && discount ? discount.type : "percentage",
    manual_value: manual && discount ? String(discount.value) : "",
    manual_funded_by:
      manual && discount
        ? discount.funded_by
        : role === "admin"
          ? "platform"
          : "supplier",
    manual_reason: manual && discount ? (discount.reason ?? "") : "",
  }
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
  const [supplierTrips, setSupplierTrips] = useState<Trip[]>([])

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      trip_id: "",
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
      discount_mode: "none",
      discount_code: "",
      manual_type: "percentage",
      manual_value: "",
      manual_funded_by: role === "admin" ? "platform" : "supplier",
      manual_reason: "",
      note: "",
    },
  })

  useEffect(() => {
    if (!booking || !open) return
    form.reset({
      trip_id: booking.trip_id,
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
      ...discountDefaults(booking, role),
      note: "",
    })
  }, [booking, open, form, role])

  // A booking can only move to a bookable trip of its own supplier; the server
  // enforces the same rule.
  const supplierId = booking?.supplier_id
  useEffect(() => {
    if (!open || !supplierId) return
    let cancelled = false
    const load =
      role === "admin"
        ? tripsApi.getTrips(undefined, undefined, undefined, {
            publicStatus: "available",
          })
        : tripsApi.getMyTrips()
    void load.then(({ data }) => {
      if (cancelled || !data) return
      setSupplierTrips(
        data.filter(
          (t) =>
            t.supplier_id === supplierId &&
            t.status !== "inactive" &&
            t.public_status !== "coming-soon",
        ),
      )
    })
    return () => {
      cancelled = true
    }
  }, [open, role, supplierId])

  const tripOptions = useMemo(() => {
    if (!trip || supplierTrips.some((t) => t.id === trip.id)) return supplierTrips
    return [trip, ...supplierTrips]
  }, [trip, supplierTrips])

  const values = form.watch()
  const selectedTrip =
    tripOptions.find((t) => t.id === values.trip_id) ??
    (values.trip_id === booking?.trip_id ? trip : undefined)
  const tripChanged = Boolean(booking) && values.trip_id !== booking?.trip_id
  const amountOverride =
    values.amount_override === "" || values.amount_override == null
      ? undefined
      : Number(values.amount_override)

  const newAmount = useMemo(() => {
    if (!booking) return 0
    if (locked) return booking.amount
    return previewAmount(booking, selectedTrip, values, amountOverride)
  }, [booking, selectedTrip, values, amountOverride, locked])

  const discountChange = booking ? discountChangeOf(booking, values) : "keep"
  const manualPreview =
    values.discount_mode === "manual" ? manualRuleOf(values) : null
  const correction = booking ? isEndedBookingCorrection(booking) : false

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
    if (data.trip_id !== booking.trip_id) {
      payload.trip_id = data.trip_id
    }
    if (selectedTrip?.is_tour) {
      payload.duration = data.duration
    }
    if (role === "admin" && amountOverride && amountOverride > 0) {
      payload.amount_override = amountOverride
    }
    const change = discountChangeOf(booking, data)
    if (change === "apply") payload.discount_code = data.discount_code!.trim()
    if (change === "remove") payload.discount_code = null
    if (change === "manual") {
      payload.manual_discount = {
        type: data.manual_type,
        value: Number(data.manual_value),
        reason: data.manual_reason?.trim() || undefined,
        ...(role === "admin" ? { funded_by: data.manual_funded_by } : {}),
      }
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
          {correction ? (
            <div
              className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-1"
              data-testid="edit-correction-banner"
            >
              <p className="font-medium">{bookingStrings.endedCorrectionTitle}</p>
              <p>{bookingStrings.endedCorrectionHint}</p>
            </div>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 sm:col-span-2">
              <Label>{bookingStrings.trip}</Label>
              <Select
                value={values.trip_id}
                onValueChange={(v) => form.setValue("trip_id", v)}
                disabled={locked || tripOptions.length <= 1}
              >
                <SelectTrigger>
                  <SelectValue placeholder={localizedTripName(trip)} />
                </SelectTrigger>
                <SelectContent>
                  {tripOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {localizedTripName(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tripChanged && role === "admin" && booking.pricing_locked ? (
                <p className="text-xs text-amber-700">
                  {bookingStrings.tripSwitchLockedHint}
                </p>
              ) : null}
            </div>
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
            {selectedTrip?.is_tour && (
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
              <Label>{bookingStrings.discountMode}</Label>
              <Select
                value={values.discount_mode}
                onValueChange={(v) =>
                  form.setValue("discount_mode", v as EditFormValues["discount_mode"])
                }
                disabled={booking.pricing_locked}
              >
                <SelectTrigger data-testid="edit-discount-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{bookingStrings.discountModeNone}</SelectItem>
                  <SelectItem value="code">{bookingStrings.discountModeCode}</SelectItem>
                  <SelectItem value="manual">{bookingStrings.discountModeManual}</SelectItem>
                </SelectContent>
              </Select>
              {booking.pricing_locked ? (
                <p className="text-xs text-text-muted">
                  {bookingStrings.discountCodeLockedHint}
                </p>
              ) : null}
            </div>
            {values.discount_mode === "code" && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-discount-code">{bookingStrings.discountCode}</Label>
                <Input
                  id="edit-discount-code"
                  dir="ltr"
                  className="uppercase"
                  disabled={booking.pricing_locked}
                  {...form.register("discount_code")}
                />
                <p className="text-xs text-text-muted">{bookingStrings.discountCodeHint}</p>
              </div>
            )}
            {values.discount_mode === "manual" && (
              <>
                <div className="space-y-2">
                  <Label>{bookingStrings.manualDiscountType}</Label>
                  <Select
                    value={values.manual_type}
                    onValueChange={(v) =>
                      form.setValue("manual_type", v as EditFormValues["manual_type"])
                    }
                    disabled={booking.pricing_locked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        {bookingStrings.manualDiscountPercentage}
                      </SelectItem>
                      <SelectItem value="fixed">{bookingStrings.manualDiscountFixed}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-manual-value">{bookingStrings.manualDiscountValue}</Label>
                  <Input
                    id="edit-manual-value"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={values.manual_type === "percentage" ? MAX_PERCENTAGE_DISCOUNT : undefined}
                    dir="ltr"
                    disabled={booking.pricing_locked}
                    {...form.register("manual_value")}
                  />
                  {form.formState.errors.manual_value?.message ? (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.manual_value.message}
                    </p>
                  ) : null}
                </div>
                {role === "admin" && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{bookingStrings.manualDiscountFundedBy}</Label>
                    <Select
                      value={values.manual_funded_by}
                      onValueChange={(v) =>
                        form.setValue(
                          "manual_funded_by",
                          v as EditFormValues["manual_funded_by"],
                        )
                      }
                      disabled={booking.pricing_locked}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="platform">
                          {bookingStrings.manualDiscountFundedPlatform}
                        </SelectItem>
                        <SelectItem value="supplier">
                          {bookingStrings.manualDiscountFundedSupplier}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-manual-reason">{bookingStrings.manualDiscountReason}</Label>
                  <Input
                    id="edit-manual-reason"
                    placeholder={bookingStrings.manualDiscountReasonPlaceholder}
                    disabled={booking.pricing_locked}
                    {...form.register("manual_reason")}
                  />
                  <p className="text-xs text-text-muted">{bookingStrings.manualDiscountHint}</p>
                </div>
              </>
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
              {discountChange === "keep" && booking.discount ? (
                <div className="flex justify-between text-text-muted">
                  <span>{discountDisplayName(booking.discount)}</span>
                  <span>
                    {booking.discount.type === "percentage"
                      ? `${booking.discount.value}%`
                      : formatCurrency(booking.discount.value, booking.currency)}
                  </span>
                </div>
              ) : null}
              {discountChange === "remove" ? (
                <div className="flex justify-between text-amber-700">
                  <span>{discountDisplayName(booking.discount)}</span>
                  <span>{bookingStrings.discountRemoved}</span>
                </div>
              ) : null}
              {discountChange === "manual" && manualPreview ? (
                <div className="flex justify-between text-text-muted">
                  <span>{bookingStrings.manualDiscountLabel}</span>
                  <span>
                    {manualPreview.type === "percentage"
                      ? `${manualPreview.value}%`
                      : formatCurrency(manualPreview.value, booking.currency)}
                  </span>
                </div>
              ) : null}
              {discountChange === "apply" ? (
                <div className="flex justify-between text-text-muted">
                  <span dir="ltr">{values.discount_code?.trim().toUpperCase()}</span>
                  <span>{bookingStrings.discountCheckedOnSave}</span>
                </div>
              ) : null}
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
