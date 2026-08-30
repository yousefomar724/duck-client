import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  computeOccupancy,
  operatingSlotsForDay,
  resolveActivityMinutes,
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
      isTour: false,
      durationDays: 1,
      activityMinutes: 90,
      turnaroundMinutes: 0,
    });
    expect(occ.occupancy_slots.map(slotHHMM)).toEqual(['07:00', '07:30', '08:00']);
  });

  it('floors a 07:15 start and ceils a non-boundary end', () => {
    const occ = computeOccupancy({
      startsAt: siteWallTimeToUtc('2026-08-10', 7, 15),
      isTour: false,
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
      isTour: false,
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
      isTour: true,
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
});
