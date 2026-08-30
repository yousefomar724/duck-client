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
  const [saving, setSaving] = useState(false)

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
    const qty = Math.max(1, Number.parseInt(quantity, 10) || 1)
    setSaving(true)
    const { error } = await createManualBooking({
      trip_id: tripId,
      full_name: name.trim(),
      phone_number: phone.trim(),
      booking_date: bookingDate,
      resource_type: resource as "kayak" | "water_cycle" | "sup",
      quantity: qty,
      local_guests: qty,
      foreigner_guests: 0,
      source: "walk_in",
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
