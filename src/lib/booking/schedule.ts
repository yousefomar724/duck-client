import { format, set, startOfDay } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import {
  localYmd,
  siteMinutesOfDay,
  siteWallTimeToUtc,
  toSiteYmd,
} from '@/lib/time';

/** Bookable window: 6:00 AM – 6:30 PM (inclusive), in minutes from midnight. */
export const BOOKING_MIN_MINUTES = 6 * 60;
export const BOOKING_MAX_MINUTES = 18 * 60 + 30;
export const BOOKING_MIN_TIME = '06:00';
export const BOOKING_MAX_TIME = '18:30';
/** Step between selectable time slots, in minutes. */
export const BOOKING_SLOT_MINUTES = 30;

/** True when the instant falls inside 06:00–18:30 Cairo wall-clock. */
export function isBookingTimeValid(date: Date): boolean {
  const minutes = siteMinutesOfDay(date);
  return minutes >= BOOKING_MIN_MINUTES && minutes <= BOOKING_MAX_MINUTES;
}

export function clampMinutesToWindow(minutes: number): number {
  if (minutes < BOOKING_MIN_MINUTES) return BOOKING_MIN_MINUTES;
  if (minutes > BOOKING_MAX_MINUTES) return BOOKING_MAX_MINUTES;
  return minutes;
}

/**
 * Move the booking to another calendar day, keeping its Cairo time-of-day.
 *
 * `picked` comes from react-day-picker, which builds plain local dates, so its
 * calendar day is read locally. The result is the matching Cairo wall time —
 * the window is Cairo opening hours, so the picker must speak Cairo too or a
 * visitor abroad gets offered slots the server then rejects.
 */
export function mergeCalendarDay(picked: Date, previous: Date): Date {
  const minutes = siteMinutesOfDay(previous);
  return siteWallTimeToUtc(
    localYmd(picked),
    Math.floor(minutes / 60),
    minutes % 60,
  );
}

/** Set the Cairo wall-clock time on the booking's existing Cairo day. */
export function mergeTimeFromHHMM(base: Date, hhmm: string): Date {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr ?? '', 10);
  const m = Number.parseInt(mStr ?? '', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return base;
  const clamped = clampMinutesToWindow(h * 60 + m);
  return siteWallTimeToUtc(
    toSiteYmd(base),
    Math.floor(clamped / 60),
    clamped % 60,
  );
}

/** `"HH:mm"` Cairo wall clock — matches the `value` of `buildTimeSlots`. */
export function siteHHMM(date: Date): string {
  const minutes = siteMinutesOfDay(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function buildTimeSlots(
  base: Date,
  locale: string,
): { value: string; label: string }[] {
  const dateFnsLocale = locale === 'ar' ? arSA : enUS;
  const slots: { value: string; label: string }[] = [];

  for (
    let m = BOOKING_MIN_MINUTES;
    m <= BOOKING_MAX_MINUTES;
    m += BOOKING_SLOT_MINUTES
  ) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const hhmm = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    const label = format(set(startOfDay(base), { hours: h, minutes: min }), 'p', {
      locale: dateFnsLocale,
    });
    slots.push({ value: hhmm, label });
  }

  return slots;
}
