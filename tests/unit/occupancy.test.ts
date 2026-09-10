import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  computeOccupancy,
  operatingSlotsForDay,
  resolveActivityMinutes,
  resolveBookingOccupancyMinutes,
  slotHHMM,
} from '@/lib/booking/occupancy';
import { siteMinutesOfDay, siteWallTimeToUtc } from '@/lib/time';

const previousTz = process.env.TZ;

describe('occupancy', () => {
  beforeAll(() => {
    process.env.TZ = 'UTC';
  });

  afterAll(() => {
    if (previousTz === undefined) delete process.env.TZ;
    else process.env.TZ = previousTz;
  });

  it('occupies 90 minutes from 07:00 as three 30-min slots', () => {
    const occ = computeOccupancy({
      startsAt: siteWallTimeToUtc('2026-08-10', 7, 0),
      blocksWholeDays: false,
      durationDays: 1,
      activityMinutes: 90,
      turnaroundMinutes: 0,
    });
    expect(occ.occupancy_slots.map(slotHHMM)).toEqual(['07:00', '07:30', '08:00']);
  });

  it('floors a 07:15 start and ceils a non-boundary end', () => {
    const occ = computeOccupancy({
      startsAt: siteWallTimeToUtc('2026-08-10', 7, 15),
      blocksWholeDays: false,
      durationDays: 1,
      activityMinutes: 90,
      turnaroundMinutes: 0,
    });
    expect(occ.occupancy_slots.map(slotHHMM)).toEqual([
      '07:00',
      '07:30',
      '08:00',
      '08:30',
    ]);
  });

  it('extends the slot set by turnaround minutes', () => {
    const occ = computeOccupancy({
      startsAt: siteWallTimeToUtc('2026-08-10', 7, 0),
      blocksWholeDays: false,
      durationDays: 1,
      activityMinutes: 90,
      turnaroundMinutes: 15,
    });
    expect(occ.occupancy_slots.map(slotHHMM)).toEqual([
      '07:00',
      '07:30',
      '08:00',
      '08:30',
    ]);
  });

  it('occupies 52 slots for a 2-day tour', () => {
    const occ = computeOccupancy({
      startsAt: siteWallTimeToUtc('2026-08-10', 9, 0),
      blocksWholeDays: true,
      durationDays: 2,
      activityMinutes: 60,
      turnaroundMinutes: 0,
    });
    expect(occ.occupancy_slots).toHaveLength(52);
    expect(operatingSlotsForDay('2026-08-10')).toHaveLength(26);
  });

  it('keeps the 06:00 slot as 06:00 Cairo on both sides of DST', () => {
    const winter = operatingSlotsForDay('2026-01-15')[0];
    const summer = operatingSlotsForDay('2026-07-15')[0];
    expect(slotHHMM(winter)).toBe('06:00');
    expect(slotHHMM(summer)).toBe('06:00');
    expect(siteMinutesOfDay(winter)).toBe(6 * 60);
    expect(siteMinutesOfDay(summer)).toBe(6 * 60);
    expect(winter.getTime()).not.toBe(summer.getTime());
  });

  it('resolves activity_minutes before duration hours', () => {
    expect(resolveActivityMinutes({ activity_minutes: 90, duration: 2, is_tour: false })).toBe(90);
    expect(resolveActivityMinutes({ duration: 2, is_tour: false })).toBe(120);
    expect(resolveActivityMinutes({ is_tour: true })).toBe(60);
  });

  describe('resolveBookingOccupancyMinutes', () => {
    it("reads a tour's length from the hours the customer picked", () => {
      // The /book picker offers 1-6 hours; activity_minutes is 0 for tours.
      const trip = { is_tour: true, activity_minutes: 0, duration: 1 };
      expect(resolveBookingOccupancyMinutes(trip, 1)).toBe(60);
      expect(resolveBookingOccupancyMinutes(trip, 3)).toBe(180);
      expect(resolveBookingOccupancyMinutes(trip, 6)).toBe(360);
    });

    it("falls back to the tour's declared hours, then one hour", () => {
      expect(resolveBookingOccupancyMinutes({ is_tour: true, duration: 2 })).toBe(120);
      expect(resolveBookingOccupancyMinutes({ is_tour: true, duration: 0 }, 0)).toBe(60);
    });

    it('leaves non-tours on their declared activity length', () => {
      expect(
        resolveBookingOccupancyMinutes({ is_tour: false, activity_minutes: 180, duration: 3 }, 5),
      ).toBe(180);
      expect(resolveBookingOccupancyMinutes({ is_tour: false, duration: 2 }, 5)).toBe(120);
    });
  });

  it('gives a 3-hour tour a 6-slot window, not three whole days', () => {
    const trip = { is_tour: true, activity_minutes: 0, duration: 1 };
    const occ = computeOccupancy({
      startsAt: siteWallTimeToUtc('2026-08-10', 9, 0),
      blocksWholeDays: false,
      durationDays: 1,
      activityMinutes: resolveBookingOccupancyMinutes(trip, 3),
      turnaroundMinutes: 0,
    });
    expect(occ.occupancy_slots.map(slotHHMM)).toEqual([
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
    ]);
    // Regression: this used to be 3 x 26 = 78 slots across three days.
    expect(occ.occupancy_slots).toHaveLength(6);
  });
});
