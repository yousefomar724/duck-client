import { describe, expect, it } from 'vitest';
import {
  clampMinutesToWindow,
  mergeCalendarDay,
  mergeTimeFromHHMM,
  buildTimeSlots,
  isBookingTimeValid,
  siteHHMM,
  BOOKING_MIN_MINUTES,
  BOOKING_MAX_MINUTES,
} from '@/lib/booking/schedule';
import { siteWallTimeToUtc, toSiteYmd } from '@/lib/time';

describe('schedule', () => {
  it('clamps minutes to bookable window', () => {
    expect(clampMinutesToWindow(0)).toBe(BOOKING_MIN_MINUTES);
    expect(clampMinutesToWindow(9999)).toBe(BOOKING_MAX_MINUTES);
    expect(clampMinutesToWindow(720)).toBe(720);
  });

  // Asserted in Cairo terms, not via getHours(): the process TZ is UTC on CI
  // and Africa/Cairo on the dev machines, and the window is Cairo-based.
  it('merges calendar day preserving the Cairo time of day', () => {
    const previous = siteWallTimeToUtc('2026-08-03', 10, 30);
    const picked = new Date(2026, 7, 10);
    const merged = mergeCalendarDay(picked, previous);
    expect(toSiteYmd(merged)).toBe('2026-08-10');
    expect(siteHHMM(merged)).toBe('10:30');
  });

  it('merges time from hh:mm in Cairo wall clock', () => {
    const base = siteWallTimeToUtc('2026-08-03', 10, 0);
    const merged = mergeTimeFromHHMM(base, '14:30');
    expect(siteHHMM(merged)).toBe('14:30');
    expect(toSiteYmd(merged)).toBe('2026-08-03');
  });

  it('keeps every offered slot inside the server-side window', () => {
    const base = siteWallTimeToUtc('2026-08-03', 10, 0);
    for (const slot of buildTimeSlots(base, 'en')) {
      expect(isBookingTimeValid(mergeTimeFromHHMM(base, slot.value))).toBe(true);
    }
  });

  it('builds time slots within window', () => {
    const slots = buildTimeSlots(new Date('2026-08-03T10:00:00'), 'en');
    expect(slots[0].value).toBe('06:00');
    expect(slots.at(-1)?.value).toBe('18:30');
    expect(slots.length).toBeGreaterThan(10);
  });
});
