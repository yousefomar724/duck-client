import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { siteMinutesOfDay, siteWallTimeToUtc } from '@/lib/time';
import { isBookingTimeValid } from '@/lib/booking/schedule';

const previousTz = process.env.TZ;

describe('site time helpers', () => {
  beforeAll(() => {
    process.env.TZ = 'UTC';
  });

  afterAll(() => {
    if (previousTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previousTz;
    }
  });

  it('siteMinutesOfDay reads Cairo wall-clock in summer DST', () => {
    // 15 Jul 2026 08:00 Africa/Cairo = 05:00Z (UTC+3)
    const date = new Date('2026-07-15T05:00:00.000Z');
    expect(siteMinutesOfDay(date)).toBe(8 * 60);
    expect(date.getUTCHours()).toBe(5);
  });

  it('siteMinutesOfDay reads Cairo wall-clock in winter', () => {
    // 15 Jan 2026 08:00 Africa/Cairo = 06:00Z (UTC+2)
    const date = new Date('2026-01-15T06:00:00.000Z');
    expect(siteMinutesOfDay(date)).toBe(8 * 60);
    expect(date.getUTCHours()).toBe(6);
  });

  it('accepts 08:00 Cairo as a valid booking time', () => {
    const date = siteWallTimeToUtc('2026-07-16', 8, 0);
    expect(isBookingTimeValid(date)).toBe(true);
  });

  it('rejects 20:00 Cairo as outside the booking window', () => {
    const date = siteWallTimeToUtc('2026-07-16', 20, 0);
    expect(isBookingTimeValid(date)).toBe(false);
  });
});
