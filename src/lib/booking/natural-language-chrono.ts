import { parse, type Component } from "chrono-node"
import { set } from "date-fns"

const EASTERN_ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"

function normalizeDigits(input: string): string {
  let s = input
  for (let i = 0; i <= 9; i++) {
    const pattern = new RegExp(`[${EASTERN_ARABIC_DIGITS[i]}${PERSIAN_DIGITS[i]}]`, "g")
    s = s.replace(pattern, String(i))
  }
  return s
}

/** Arabic phrase → English tokens understood by chrono (longest match first). */
const AR_TO_EN_PHRASES: readonly [string, string][] = [
  ["بعد غد", "day after tomorrow"],
  ["بعد الغد", "day after tomorrow"],
  ["الأسبوع القادم", "next week"],
  ["اسبوع القادم", "next week"],
  ["الأسبوع الجاي", "next week"],
  ["خلال يومين", "in 2 days"],
  ["بعد أسبوعين", "in 2 weeks"],
  ["بعد اسبوعين", "in 2 weeks"],
  ["خلال أسبوع", "in 1 week"],
  ["بعد أسبوع", "in 1 week"],
  ["بعد اسبوع", "in 1 week"],
  ["غدًا", "tomorrow"],
  ["غداً", "tomorrow"],
  ["غدا", "tomorrow"],
  ["غد", "tomorrow"],
  ["اليوم", "today"],
  ["يوم الجمعة", "Friday"],
  ["يوم السبت", "Saturday"],
  ["يوم الأحد", "Sunday"],
  ["يوم الإثنين", "Monday"],
  ["يوم الاثنين", "Monday"],
  ["يوم الثلاثاء", "Tuesday"],
  ["يوم الأربعاء", "Wednesday"],
  ["يوم الخميس", "Thursday"],
  ["الجمعة", "Friday"],
  ["السبت", "Saturday"],
  ["الأحد", "Sunday"],
  ["الإثنين", "Monday"],
  ["الاثنين", "Monday"],
  ["الثلاثاء", "Tuesday"],
  ["الأربعاء", "Wednesday"],
  ["الخميس", "Thursday"],
  ["جمعة", "Friday"],
  ["صباحًا", "am"],
  ["صباحاً", "am"],
  ["مساءً", "pm"],
  ["مساءا", "pm"],
  ["بليل", "pm"],
  ["الساعة", "at"],
]

const SORTED_AR_TO_EN = [...AR_TO_EN_PHRASES].sort(
  (a, b) => b[0].length - a[0].length,
)

export function normalizeNaturalLanguageForChrono(
  raw: string,
  locale: string,
): string {
  let text = raw.trim()
  if (!text) return text
  text = normalizeDigits(text)
  if (locale !== "ar") return text

  let out = text
  for (const [ar, en] of SORTED_AR_TO_EN) {
    if (out.includes(ar)) {
      out = out.split(ar).join(en)
    }
  }
  return out
}

/**
 * Parses NL schedule text. If chrono did not extract an hour, uses wall clock from `timeFallback`.
 */
export function parseNaturalLanguageToBookingDate(
  raw: string,
  locale: string,
  referenceDate: Date,
  timeFallback: Date,
): Date | null {
  const normalized = normalizeNaturalLanguageForChrono(raw, locale)
  if (!normalized.trim()) return null

  const results = parse(normalized, referenceDate)
  const first = results[0]
  if (!first) return null

  const parsed = first.date()
  const hourComponent = "hour" as Component
  if (!first.start.isCertain(hourComponent)) {
    return set(parsed, {
      hours: timeFallback.getHours(),
      minutes: timeFallback.getMinutes(),
      seconds: 0,
      milliseconds: 0,
    })
  }
  return parsed
}
