import { describe, expect, it } from 'vitest';
import {
  getRelativeDayKind,
  formatBookingDayPhrase,
  formatBookingTime,
} from '@/lib/booking/relative-booking-day';

describe('relative-booking-day', () => {
  const now = new Date('2026-08-03T12:00:00');

  it('detects relative day kinds', () => {
    expect(getRelativeDayKind(new Date('2026-08-03T15:00:00'), now)).toBe('today');
    expect(getRelativeDayKind(new Date('2026-08-04T15:00:00'), now)).toBe('tomorrow');
    expect(getRelativeDayKind(new Date('2026-08-05T15:00:00'), now)).toBe('dayAfterTomorrow');
    expect(getRelativeDayKind(new Date('2026-08-10T15:00:00'), now)).toBe('other');
  });

  const labels = {
    today: 'Today',
    tomorrow: 'Tomorrow',
    dayAfterTomorrow: 'Day after tomorrow',
  };

  // `now` is passed explicitly so these assertions don't depend on the day
  // the suite happens to run on.
  it('formats day phrase with labels', () => {
    expect(
      formatBookingDayPhrase(new Date('2026-08-03T15:00:00'), 'en', labels, now),
    ).toBe('Today');
    expect(
      formatBookingDayPhrase(new Date('2026-08-04T15:00:00'), 'en', labels, now),
    ).toBe('Tomorrow');
    expect(
      formatBookingDayPhrase(new Date('2026-08-05T15:00:00'), 'en', labels, now),
    ).toBe('Day after tomorrow');
  });

  it('falls back to a localized long date beyond three days', () => {
    expect(
      formatBookingDayPhrase(new Date('2026-08-10T15:00:00'), 'en', labels, now),
    ).toBe('August 10th, 2026');
  });

  it('formats time by locale', () => {
    expect(formatBookingTime(new Date('2026-08-03T15:30:00'), 'en')).toBeTruthy();
  });
});
