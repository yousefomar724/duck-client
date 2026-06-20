"use client"

import { useMemo, useState } from "react"
import { format, set, startOfDay } from "date-fns"
import { arSA, enUS } from "date-fns/locale"
import {
  arSA as arSADayPicker,
  enUS as enUSDayPicker,
} from "react-day-picker/locale"
import { CalendarIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  formatBookingDayPhrase,
  formatBookingTime,
} from "@/lib/booking/relative-booking-day"
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

/** Bookable window: 6:00 AM – 6:30 PM (inclusive), in minutes from midnight. */
export const BOOKING_MIN_MINUTES = 6 * 60 // 06:00
export const BOOKING_MAX_MINUTES = 18 * 60 + 30 // 18:30
export const BOOKING_MIN_TIME = "06:00"
export const BOOKING_MAX_TIME = "18:30"
/** Step between selectable time slots, in minutes. */
export const BOOKING_SLOT_MINUTES = 30

function clampMinutesToWindow(minutes: number): number {
  if (minutes < BOOKING_MIN_MINUTES) return BOOKING_MIN_MINUTES
  if (minutes > BOOKING_MAX_MINUTES) return BOOKING_MAX_MINUTES
  return minutes
}

function mergeCalendarDay(picked: Date, previous: Date): Date {
  return set(previous, {
    year: picked.getFullYear(),
    month: picked.getMonth(),
    date: picked.getDate(),
  })
}

function mergeTimeFromHHMM(base: Date, hhmm: string): Date {
  const [hStr, mStr] = hhmm.split(":")
  const h = Number.parseInt(hStr ?? "", 10)
  const m = Number.parseInt(mStr ?? "", 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return base
  const clamped = clampMinutesToWindow(h * 60 + m)
  return set(base, {
    hours: Math.floor(clamped / 60),
    minutes: clamped % 60,
    seconds: 0,
    milliseconds: 0,
  })
}

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

  const dayPhrase = formatBookingDayPhrase(value, locale, relativeLabels)

  const dateTriggerId = `booking-date-${name ?? "booking"}`
  const timeInputId = `booking-time-${name ?? "booking"}`

  // Only times inside the bookable window are offered, so impossible times
  // (before 6:00 AM or after 6:30 PM) can never be selected.
  const timeSlots = useMemo(() => {
    const slots: { value: string; label: string }[] = []
    for (
      let m = BOOKING_MIN_MINUTES;
      m <= BOOKING_MAX_MINUTES;
      m += BOOKING_SLOT_MINUTES
    ) {
      const h = Math.floor(m / 60)
      const min = m % 60
      const hhmm = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
      const label = format(
        set(startOfDay(value), { hours: h, minutes: min }),
        "p",
        { locale: dateFnsLocale },
      )
      slots.push({ value: hhmm, label })
    }
    return slots
  }, [value, dateFnsLocale])

  const selectedTime = format(value, "HH:mm")

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
                selected={value}
                defaultMonth={value}
                locale={locale === "ar" ? arSADayPicker : enUSDayPicker}
                dir={dir}
                disabled={(date) => startOfDay(date) < startOfDay(new Date())}
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
              aria-label={`${t("bookingTime")}: ${formatBookingTime(value, locale)}`}
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
          time: format(value, "p", { locale: dateFnsLocale }),
        })}
      </p>
      <p className="text-muted-foreground px-1 text-xs">
        {t("bookingTimeWindowHint")}
      </p>
    </div>
  )
}
