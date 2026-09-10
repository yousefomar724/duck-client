"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { OpsBookingCard } from "./ops-booking-card"
import { WalkInSheet } from "./walk-in-sheet"
import { BookingDetailSheet } from "@/components/dashboard/bookings/booking-detail-sheet"
import { useBookingActions } from "@/components/dashboard/bookings/use-booking-actions"
import { bandLabels, opsStrings } from "./ops-strings"
import { BAND_CLASS } from "./heat"
import type { DemandBand } from "./heat"
import { cn } from "@/lib/utils"
import type { OpsHourBooking, OpsResourceUtilisation } from "@/lib/api/ops"
import type { Booking } from "@/lib/types"
import { resourceLabels } from "@/lib/bookings/status"
import { EmptyState } from "@/components/dashboard/empty-state"
import { CalendarCheck } from "lucide-react"

export function OpsHourPanel({
  date,
  time,
  bookings,
  units,
  capacity,
  perResource = [],
  pct,
  band,
  role,
  onReload,
  onUpdated,
}: {
  date: string
  time: string
  bookings: OpsHourBooking[]
  units: number
  capacity: number
  perResource?: OpsResourceUtilisation[]
  pct: number
  band: DemandBand
  role: "admin" | "supplier"
  onReload: () => void
  onUpdated: (booking: OpsHourBooking) => void
}) {
  const [walkIn, setWalkIn] = useState(false)
  const { handleAction, loadingAction } = useBookingActions({
    onRefresh: onReload,
    onDeleted: () => setDetail(null),
  })
  const [detail, setDetail] = useState<Booking | null>(null)

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {date} · {time}
          </h2>
          <p className="text-sm text-text-muted">
            {units} / {capacity} · {pct}%
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {perResource
              .filter((resource) => resource.capacity > 0)
              .map((resource) => (
                <span
                  key={resource.type}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    BAND_CLASS[resource.band],
                  )}
                >
                  {resourceLabels[resource.type] ?? resource.type}: {resource.units} /{" "}
                  {resource.capacity}
                </span>
              ))}
          </div>
        </div>
        <span className={cn("rounded-full px-2 py-1 text-xs font-medium", BAND_CLASS[band])}>
          {bandLabels[band]}
        </span>
      </div>
      <Button
        type="button"
        className="h-11! bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover"
        onClick={() => setWalkIn(true)}
      >
        {opsStrings.walkIn}
      </Button>
      {bookings.length === 0 ? (
        <EmptyState icon={CalendarCheck} title={opsStrings.noBookings} />
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <OpsBookingCard
              key={booking.ID}
              booking={booking}
              onOpen={() => setDetail(booking)}
              onUpdated={onUpdated}
            />
          ))}
        </div>
      )}
      <WalkInSheet
        open={walkIn}
        onOpenChange={setWalkIn}
        role={role}
        date={date}
        time={time}
        onCreated={onReload}
      />
      <BookingDetailSheet
        booking={detail}
        open={detail != null}
        onOpenChange={(open) => {
          if (!open) setDetail(null)
        }}
        role={role}
        loadingAction={loadingAction}
        onAction={handleAction}
      />
    </section>
  )
}
