import { describe, expect, it } from 'vitest';
import {
  clampMinutesToWindow,
  mergeCalendarDay,
  mergeTimeFromHHMM,
  buildTimeSlots,
  BOOKING_MIN_MINUTES,
  BOOKING_MAX_MINUTES,
} from '@/lib/booking/schedule';

describe('schedule', () => {
  it('clamps minutes to bookable window', () => {
    expect(clampMinutesToWindow(0)).toBe(BOOKING_MIN_MINUTES);
    expect(clampMinutesToWindow(9999)).toBe(BOOKING_MAX_MINUTES);
    expect(clampMinutesToWindow(720)).toBe(720);
  });

  it('merges calendar day preserving time', () => {
    const previous = new Date('2026-08-03T10:30:00');
    const picked = new Date('2026-08-10T00:00:00');
    const merged = mergeCalendarDay(picked, previous);
    expect(merged.getDate()).toBe(10);
    expect(merged.getHours()).toBe(10);
  });

  it('merges time from hh:mm', () => {
    const base = new Date('2026-08-03T10:00:00');
    const merged = mergeTimeFromHHMM(base, '14:30');
    expect(merged.getHours()).toBe(14);
    expect(merged.getMinutes()).toBe(30);
  });

  it('builds time slots within window', () => {
    const slots = buildTimeSlots(new Date('2026-08-03T10:00:00'), 'en');
    expect(slots[0].value).toBe('06:00');
    expect(slots.at(-1)?.value).toBe('18:30');
    expect(slots.length).toBeGreaterThan(10);
  });
});
