import { differenceInCalendarDays, format, startOfDay } from "date-fns"
import { arSA, enUS } from "date-fns/locale"

export type RelativeDayKind =
  | "today"
  | "tomorrow"
  | "dayAfterTomorrow"
  | "other"

export function getRelativeDayKind(
  selected: Date,
  now: Date = new Date(),
): RelativeDayKind {
  const delta = differenceInCalendarDays(
    startOfDay(selected),
    startOfDay(now),
  )
  if (delta === 0) return "today"
  if (delta === 1) return "tomorrow"
  if (delta === 2) return "dayAfterTomorrow"
  return "other"
}

export type RelativeDayLabels = {
  today: string
  tomorrow: string
  dayAfterTomorrow: string
}

/** Calendar-day phrase (today / tomorrow / …) or localized long date. */
export function formatBookingDayPhrase(
  selected: Date,
  locale: string,
  labels: RelativeDayLabels,
): string {
  const dateFnsLocale = locale === "ar" ? arSA : enUS
  switch (getRelativeDayKind(selected)) {
    case "today":
      return labels.today
    case "tomorrow":
      return labels.tomorrow
    case "dayAfterTomorrow":
      return labels.dayAfterTomorrow
    default:
      return format(selected, "PPP", { locale: dateFnsLocale })
  }
}

export function formatBookingTime(selected: Date, locale: string): string {
  return format(selected, "p", {
    locale: locale === "ar" ? arSA : enUS,
  })
}
