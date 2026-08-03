import { format, set, startOfDay } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

/** Bookable window: 6:00 AM – 6:30 PM (inclusive), in minutes from midnight. */
export const BOOKING_MIN_MINUTES = 6 * 60;
export const BOOKING_MAX_MINUTES = 18 * 60 + 30;
export const BOOKING_MIN_TIME = '06:00';
export const BOOKING_MAX_TIME = '18:30';
/** Step between selectable time slots, in minutes. */
export const BOOKING_SLOT_MINUTES = 30;

export function clampMinutesToWindow(minutes: number): number {
  if (minutes < BOOKING_MIN_MINUTES) return BOOKING_MIN_MINUTES;
  if (minutes > BOOKING_MAX_MINUTES) return BOOKING_MAX_MINUTES;
  return minutes;
}

export function mergeCalendarDay(picked: Date, previous: Date): Date {
  return set(previous, {
    year: picked.getFullYear(),
    month: picked.getMonth(),
    date: picked.getDate(),
  });
}

export function mergeTimeFromHHMM(base: Date, hhmm: string): Date {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr ?? '', 10);
  const m = Number.parseInt(mStr ?? '', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return base;
  const clamped = clampMinutesToWindow(h * 60 + m);
  return set(base, {
    hours: Math.floor(clamped / 60),
    minutes: clamped % 60,
    seconds: 0,
    milliseconds: 0,
  });
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
