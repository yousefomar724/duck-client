"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { arSA, enUS } from "date-fns/locale"
import {
  arSA as arSADayPicker,
  enUS as enUSDayPicker,
} from "react-day-picker/locale"
import { CalendarIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { startOfDay } from "date-fns"

import {
  formatBookingDayPhrase,
  formatBookingTime,
} from "@/lib/booking/relative-booking-day"
import {
  BOOKING_MIN_MINUTES,
  BOOKING_MAX_MINUTES,
  BOOKING_SLOT_MINUTES,
  buildTimeSlots,
  mergeCalendarDay,
  mergeTimeFromHHMM,
  siteHHMM,
} from "@/lib/booking/schedule"
import { siteWallClock } from "@/lib/time"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export {
  BOOKING_MIN_MINUTES,
  BOOKING_MAX_MINUTES,
  BOOKING_MIN_TIME,
  BOOKING_MAX_TIME,
  BOOKING_SLOT_MINUTES,
} from "@/lib/booking/schedule"

export type BookingScheduleFieldProps = {
  value: Date
  onChange: (d: Date) => void
  onBlur?: () => void
  name?: string
  locale: string
}

export function BookingScheduleField({
  value,
  onChange,
  onBlur,
  name,
  locale,
}: BookingScheduleFieldProps) {
  const t = useTranslations("book")
  const [open, setOpen] = useState(false)

  const dir = locale === "ar" ? "rtl" : "ltr"
  const dateFnsLocale = locale === "ar" ? arSA : enUS

  const relativeLabels = {
    today: t("relativeDayToday"),
    tomorrow: t("relativeDayTomorrow"),
    dayAfterTomorrow: t("relativeDayAfterTomorrow"),
  }

  // The bookable window is Cairo opening hours, so the picker renders Cairo
  // wall-clock rather than the visitor's device time — otherwise a tourist
  // abroad is shown slots the server rejects.
  const wallClock = siteWallClock(value)
  const nowWallClock = siteWallClock(new Date())

  const dayPhrase = formatBookingDayPhrase(
    wallClock,
    locale,
    relativeLabels,
    nowWallClock,
  )

  const dateTriggerId = `booking-date-${name ?? "booking"}`
  const timeInputId = `booking-time-${name ?? "booking"}`

  const timeSlots = useMemo(
    () => buildTimeSlots(wallClock, locale),
    [wallClock, locale],
  )

  const selectedTime = siteHHMM(value)

  return (
    <div className="space-y-2" dir={dir}>
      <div className="flex flex-row flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 basis-[min(100%,14rem)] flex-col gap-1.5">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                id={dateTriggerId}
                type="button"
                variant="outline"
                aria-label={`${t("bookingCalendarAria")}: ${dayPhrase}`}
                className={cn(
                  "w-full justify-between gap-2 rounded-lg border-black/20 font-normal text-start hover:bg-background",
                )}
                onBlur={onBlur}
              >
                <span className="truncate">{dayPhrase}</span>
                <CalendarIcon className="size-4 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto overflow-hidden p-0"
              align={locale === "ar" ? "end" : "start"}
              dir={dir}
            >
              <Calendar
                mode="single"
                captionLayout="dropdown"
                selected={wallClock}
                defaultMonth={wallClock}
                locale={locale === "ar" ? arSADayPicker : enUSDayPicker}
                dir={dir}
                disabled={(date) => startOfDay(date) < startOfDay(nowWallClock)}
                onSelect={(d) => {
                  if (!d) return
                  onChange(mergeCalendarDay(d, value))
                  setOpen(false)
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          <Select
            dir={dir}
            value={selectedTime}
            onValueChange={(v) => {
              onChange(mergeTimeFromHHMM(value, v))
              onBlur?.()
            }}
          >
            <SelectTrigger
              id={timeInputId}
              aria-label={`${t("bookingTime")}: ${formatBookingTime(wallClock, locale)}`}
              className="w-44 max-w-full rounded-lg border-black/20 focus-visible:border-duck-cyan focus-visible:ring-duck-cyan"
            >
              <SelectValue placeholder={t("bookingTime")} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {timeSlots.map((slot) => (
                <SelectItem key={slot.value} value={slot.value}>
                  {slot.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-muted-foreground px-1 text-sm">
        {t("bookingScheduleSummaryNatural", {
          day: dayPhrase,
          time: format(wallClock, "p", { locale: dateFnsLocale }),
        })}
      </p>
      <p className="text-muted-foreground px-1 text-xs">
        {t("bookingTimeWindowHint")}
      </p>
    </div>
  )
}
