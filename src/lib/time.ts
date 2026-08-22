/** Display timezone for booking dates and times shown to users. */
export const SITE_TIME_ZONE = "Africa/Cairo"

export const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isValidYmd(value: string): boolean {
  if (!YMD_PATTERN.test(value)) return false
  const [year, month, day] = value.split("-").map(Number)
  const probe = new Date(Date.UTC(year, month - 1, day))
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  )
}

function siteParts(date: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
  const map: Record<string, string> = {}
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour === "24" ? "0" : map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  }
}

/** Convert a wall-clock time in SITE_TIME_ZONE to a UTC Date. */
export function siteWallTimeToUtc(
  ymd: string,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
): Date {
  const [year, month, day] = ymd.split("-").map(Number)
  let utc = Date.UTC(year, month - 1, day, hour - 2, minute, second, ms)
  for (let i = 0; i < 4; i++) {
    const parts = siteParts(new Date(utc))
    const got = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    )
    const want = Date.UTC(year, month - 1, day, hour, minute, second)
    const delta = want - got
    if (delta === 0) break
    utc += delta
  }
  return new Date(utc)
}

export function startOfSiteDay(ymd: string): Date {
  return siteWallTimeToUtc(ymd, 0, 0, 0, 0)
}

export const zonedStartOfDay = startOfSiteDay

export function endOfSiteDay(ymd: string): Date {
  return siteWallTimeToUtc(ymd, 23, 59, 59, 999)
}

/** First instant after the given site-local calendar day. */
export function zonedEndOfDayExclusive(ymd: string): Date {
  return new Date(endOfSiteDay(ymd).getTime() + 1)
}

export function toSiteYmd(date: Date): string {
  const parts = siteParts(date)
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
}

/** Minutes since midnight in SITE_TIME_ZONE (Cairo), independent of process TZ. */
export function siteMinutesOfDay(date: Date): number {
  const parts = siteParts(date)
  return parts.hour * 60 + parts.minute
}

/**
 * A Date whose *local* wall-clock fields mirror the Cairo wall clock of
 * `date`. Not a real instant — use it only to hand Cairo-local Y/M/D/h/m to
 * libraries that read `getFullYear()`/`getHours()` (date-fns formatting,
 * react-day-picker), so the UI shows Cairo time on a device in any timezone.
 */
export function siteWallClock(date: Date): Date {
  const parts = siteParts(date)
  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
}

/** Calendar day (`YYYY-MM-DD`) of a Date read in local time, not Cairo. */
export function localYmd(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
