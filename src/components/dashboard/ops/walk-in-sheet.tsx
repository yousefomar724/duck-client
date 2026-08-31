"use client"

import { useEffect, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
import { createManualBooking } from "@/lib/api/bookings"
import * as tripsApi from "@/lib/api/trips"
import { siteWallTimeToUtc } from "@/lib/time"
import type { Trip } from "@/lib/types"
import { resolveLocalizedField } from "@/lib/dashboard/localize"
import { opsStrings } from "./ops-strings"
import { useToast } from "@/lib/stores/toast-store"
import { resourceLabels } from "@/lib/bookings/status"
import { calculateBookingTotal } from "@/lib/booking/pricing"
import { formatCurrency } from "@/lib/constants"

export function WalkInSheet({
  open,
  onOpenChange,
  role,
  date,
  time,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: "admin" | "supplier"
  date: string
  time: string
  onCreated: () => void
}) {
  const { addToast } = useToast()
  const [trips, setTrips] = useState<Trip[]>([])
  const [tripId, setTripId] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [resource, setResource] = useState("kayak")
  const [quantity, setQuantity] = useState("1")
  const [foreigners, setForeigners] = useState("0")
  const [collected, setCollected] = useState("")
  const [saving, setSaving] = useState(false)

  const qty = Math.max(1, Number.parseInt(quantity, 10) || 1)
  const foreignerGuests = Math.min(qty, Math.max(0, Number.parseInt(foreigners, 10) || 0))
  const localGuests = qty - foreignerGuests
  const selectedTrip = trips.find((t) => t.id === tripId)

  // Priced client-side purely to prefill the collected amount and show staff a
  // total before saving. The server reprices authoritatively in buildBooking.
  const estimatedTotal = selectedTrip
    ? calculateBookingTotal({
        trip: selectedTrip,
        guestMix: "mixed",
        guests: qty,
        localGuests,
        foreignerGuests,
        duration: 1,
      })
    : 0

  useEffect(() => {
    if (!open) return
    const load = role === "admin" ? tripsApi.getTrips() : tripsApi.getMyTrips()
    void load.then(({ data }) => {
      if (data) setTrips(data)
    })
  }, [open, role])

  const submit = async () => {
    const [h, m] = time.split(":").map(Number)
    const bookingDate = siteWallTimeToUtc(date, h, m).toISOString()
    const typed = collected.trim()
    setSaving(true)
    const { error } = await createManualBooking({
      trip_id: tripId,
      full_name: name.trim(),
      phone_number: phone.trim(),
      booking_date: bookingDate,
      resource_type: resource as "kayak" | "water_cycle" | "sup",
      quantity: qty,
      local_guests: localGuests,
      foreigner_guests: foreignerGuests,
      source: "walk_in",
      // Omitted means "paid in full" server-side; an explicit 0 records an
      // unpaid walk-in with a balance still to collect.
      amount_paid: typed === "" ? undefined : Math.max(0, Number(typed) || 0),
    })
    setSaving(false)
    if (error) {
      addToast(error, "error")
      return
    }
    addToast("تم إنشاء الحجز الحضوري", "success")
    onCreated()
    onOpenChange(false)
    setName("")
    setPhone("")
    setForeigners("0")
    setCollected("")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>
            {opsStrings.walkIn} · {date} {time}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label>النشاط</Label>
            <Select value={tripId} onValueChange={setTripId}>
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder="اختر النشاط" />
              </SelectTrigger>
              <SelectContent>
                {trips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {resolveLocalizedField(trip.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="walk-in-name">الاسم</Label>
            <Input id="walk-in-name" className="min-h-11" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="walk-in-phone">الهاتف</Label>
            <Input id="walk-in-phone" className="min-h-11" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>المعدة</Label>
            <Select value={resource} onValueChange={setResource}>
              <SelectTrigger className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(resourceLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="walk-in-qty">الكمية</Label>
            <Input
              id="walk-in-qty"
              type="number"
              min={1}
              className="min-h-11"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="walk-in-foreigners">منهم أجانب</Label>
            <Input
              id="walk-in-foreigners"
              type="number"
              min={0}
              max={qty}
              className="min-h-11"
              value={foreigners}
              onChange={(e) => setForeigners(e.target.value)}
            />
            <p className="text-xs text-text-muted">
              {localGuests} محلي · {foreignerGuests} أجنبي
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="walk-in-collected">المبلغ المحصل</Label>
            <Input
              id="walk-in-collected"
              type="number"
              min={0}
              inputMode="decimal"
              className="min-h-11"
              placeholder={
                selectedTrip
                  ? formatCurrency(estimatedTotal, selectedTrip.currency)
                  : "المبلغ كاملاً"
              }
              value={collected}
              onChange={(e) => setCollected(e.target.value)}
            />
            <p className="text-xs text-text-muted">
              {selectedTrip
                ? `الإجمالي المتوقع ${formatCurrency(estimatedTotal, selectedTrip.currency)} — اتركه فارغاً للدفع الكامل`
                : "اتركه فارغاً للدفع الكامل"}
            </p>
          </div>
          <Button
            type="button"
            className="h-11! w-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover"
            disabled={saving || !tripId || name.trim().length < 2 || !phone.trim()}
            onClick={() => void submit()}
          >
            {saving ? "جاري الحفظ..." : "تأكيد الحجز الحضوري"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
