"use client"

import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

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
  return set(base, {
    hours: h,
    minutes: m,
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
          <Input
            id={timeInputId}
            type="time"
            step={60}
            dir="ltr"
            value={format(value, "HH:mm")}
            aria-label={`${t("bookingTime")}: ${formatBookingTime(value, locale)}`}
            onChange={(e) => {
              onChange(mergeTimeFromHHMM(value, e.target.value))
            }}
            className="w-44 max-w-full rounded-lg border-black/20 focus-visible:border-duck-cyan focus-visible:ring-duck-cyan [&::-webkit-calendar-picker-indicator]:opacity-70"
          />
        </div>
      </div>

      <p className="text-muted-foreground px-1 text-sm">
        {t("bookingScheduleSummaryNatural", {
          day: dayPhrase,
          time: format(value, "p", { locale: dateFnsLocale }),
        })}
      </p>
    </div>
  )
}
