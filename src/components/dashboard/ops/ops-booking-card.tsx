"use client"

import StatusBadge from "@/components/shared/status-badge"
import { PaymentStateBadge } from "@/components/shared/payment-state-badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency, formatTimeShort } from "@/lib/constants"
import { localizedTripName, resourceLabels } from "@/lib/bookings/status"
import type { OpsHourBooking } from "@/lib/api/ops"
import { bookingNationality } from "./ops-strings"
import { NationalityFlag } from "./nationality-flag"
import { OpsStatusActions } from "./ops-status-actions"
import { Button } from "@/components/ui/button"
import { Phone, MessageCircle } from "lucide-react"
import { phoneToWhatsAppDigits } from "@/lib/booking/phone"

export function OpsBookingCard({
  booking,
  onOpen,
  onUpdated,
}: {
  booking: OpsHourBooking
  onOpen: () => void
  onUpdated: (booking: OpsHourBooking) => void
}) {
  const wa = phoneToWhatsAppDigits(booking.phone_number)
  const nationality = booking.nationality ?? bookingNationality(booking)

  return (
    <Card className="cursor-pointer hover:shadow-md" onClick={onOpen}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-text-dark">{booking.full_name}</p>
            <p className="text-sm text-text-muted">
              {localizedTripName(booking.trip)} · {formatTimeShort(booking.booking_date ?? "")}
            </p>
          </div>
          <StatusBadge
            status={booking.status}
            type="booking"
            short
            bookingDate={booking.booking_date}
            endsAt={booking.ends_at}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PaymentStateBadge booking={booking} />
          <NationalityFlag kind={nationality} />
          {booking.resource_type ? (
            <span className="text-xs text-text-muted">
              {resourceLabels[booking.resource_type] ?? booking.resource_type} × {booking.quantity}
            </span>
          ) : null}
          <span className="text-xs font-medium">
            {formatCurrency(booking.amount, booking.currency)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          {booking.phone_number ? (
            <Button asChild size="sm" variant="outline" className="min-h-11">
              <a href={`tel:${booking.phone_number}`}>
                <Phone className="size-4" />
                اتصال
              </a>
            </Button>
          ) : null}
          {wa ? (
            <Button asChild size="sm" variant="outline" className="min-h-11">
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" />
                واتساب
              </a>
            </Button>
          ) : null}
        </div>
        <OpsStatusActions
          booking={booking}
          onUpdated={(next) => onUpdated({ ...booking, ...next })}
        />
      </CardContent>
    </Card>
  )
}
