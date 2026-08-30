import {
  BOOKING_MAX_MINUTES,
  BOOKING_MIN_MINUTES,
  BOOKING_SLOT_MINUTES,
} from '@/lib/booking/schedule';
import {
  addSiteDays,
  siteMinutesOfDay,
  siteWallTimeToUtc,
  startOfSiteDay,
  toSiteYmd,
} from '@/lib/time';

/** Written onto every booking whose occupancy was computed by this module. */
export const OCCUPANCY_VERSION = 1;

/** Walk-in / dock grace: a slot that started up to this long ago is still bookable. */
export const PAST_BOOKING_GRACE_MS = 2 * 60 * 60 * 1000;

export function isHourlyCapacityEnabled(): boolean {
  return process.env.OPS_HOURLY_CAPACITY === '1';
}

export function operatingSlotsForDay(ymd: string): Date[] {
  const slots: Date[] = [];
  for (let m = BOOKING_MIN_MINUTES; m <= BOOKING_MAX_MINUTES; m += BOOKING_SLOT_MINUTES) {
    slots.push(siteWallTimeToUtc(ymd, Math.floor(m / 60), m % 60));
  }
  return slots;
}

/**
 * `activity_minutes` is authoritative. Fall back to numeric `duration` hours
 * for non-tours, then 60 minutes. Never parses `duration_text`.
 */
export function resolveActivityMinutes(trip: {
  activity_minutes?: number | null;
  duration?: number | null;
  is_tour?: boolean;
}): number {
  if (typeof trip.activity_minutes === 'number' && trip.activity_minutes > 0) {
    return trip.activity_minutes;
  }
  if (!trip.is_tour && typeof trip.duration === 'number' && trip.duration > 0) {
    return trip.duration * 60;
  }
  return 60;
}

function wallMinutesToUtc(ymd: string, totalMinutes: number): Date {
  const dayLength = 24 * 60;
  const dayOffset = Math.floor(totalMinutes / dayLength);
  let minutes = totalMinutes - dayOffset * dayLength;
  if (minutes < 0) {
    minutes += dayLength;
  }
  return siteWallTimeToUtc(
    addSiteDays(ymd, dayOffset),
    Math.floor(minutes / 60),
    minutes % 60,
  );
}

export function computeOccupancy(opts: {
  startsAt: Date;
  isTour: boolean;
  durationDays: number;
  activityMinutes: number;
  turnaroundMinutes: number;
}): { starts_at: Date; ends_at: Date; occupancy_slots: Date[] } {
  if (opts.isTour) {
    const startYmd = toSiteYmd(opts.startsAt);
    const days = Math.max(1, Math.floor(opts.durationDays) || 1);
    const occupancy_slots: Date[] = [];
    for (let i = 0; i < days; i++) {
      occupancy_slots.push(...operatingSlotsForDay(addSiteDays(startYmd, i)));
    }
    return {
      starts_at: occupancy_slots[0] ?? siteWallTimeToUtc(startYmd, 6, 0),
      ends_at: startOfSiteDay(addSiteDays(startYmd, days)),
      occupancy_slots,
    };
  }

  const startYmd = toSiteYmd(opts.startsAt);
  const startMinutes = siteMinutesOfDay(opts.startsAt);
  const alignedStart =
    Math.floor(startMinutes / BOOKING_SLOT_MINUTES) * BOOKING_SLOT_MINUTES;
  const span = Math.max(0, opts.activityMinutes) + Math.max(0, opts.turnaroundMinutes);
  const endAbs = startMinutes + span;
  const alignedEnd =
    endAbs % BOOKING_SLOT_MINUTES === 0
      ? endAbs
      : Math.ceil(endAbs / BOOKING_SLOT_MINUTES) * BOOKING_SLOT_MINUTES;

  const occupancy_slots: Date[] = [];
  for (let m = alignedStart; m < alignedEnd; m += BOOKING_SLOT_MINUTES) {
    const dayMinutes = ((m % (24 * 60)) + 24 * 60) % (24 * 60);
    if (dayMinutes >= BOOKING_MIN_MINUTES && dayMinutes <= BOOKING_MAX_MINUTES) {
      occupancy_slots.push(wallMinutesToUtc(startYmd, m));
    }
  }

  return {
    starts_at: wallMinutesToUtc(startYmd, alignedStart),
    ends_at: wallMinutesToUtc(startYmd, alignedEnd),
    occupancy_slots,
  };
}

export function occupancySlotsEqual(
  a: Date[] | undefined,
  b: Date[] | undefined,
): boolean {
  const aa = a ?? [];
  const bb = b ?? [];
  if (aa.length !== bb.length) return false;
  const as = aa.map((d) => d.getTime()).sort((x, y) => x - y);
  const bs = bb.map((d) => d.getTime()).sort((x, y) => x - y);
  return as.every((t, i) => t === bs[i]);
}

export function slotHHMM(slot: Date): string {
  const minutes = siteMinutesOfDay(slot);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export const SLOT_HHMM_PATTERN = /^([01]\d|2[0-3]):(00|30)$/;

export function isValidSlotHHMM(value: string): boolean {
  if (!SLOT_HHMM_PATTERN.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  const minutes = h * 60 + m;
  return minutes >= BOOKING_MIN_MINUTES && minutes <= BOOKING_MAX_MINUTES;
}

export function hourLabels(): string[] {
  const labels: string[] = [];
  for (let h = 6; h <= 18; h++) {
    labels.push(`${String(h).padStart(2, '0')}:00`);
  }
  return labels;
}

export function slotsForHour(ymd: string, hour: number): Date[] {
  const slots = [siteWallTimeToUtc(ymd, hour, 0)];
  if (hour * 60 + 30 <= BOOKING_MAX_MINUTES) {
    slots.push(siteWallTimeToUtc(ymd, hour, 30));
  }
  return slots;
}

export function parseHHMM(value: string): { hour: number; minute: number } | null {
  if (!SLOT_HHMM_PATTERN.test(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  return { hour, minute };
}

export function slotUtc(ymd: string, hhmm: string): Date | null {
  const parsed = parseHHMM(hhmm);
  if (!parsed) return null;
  const minutes = parsed.hour * 60 + parsed.minute;
  if (minutes < BOOKING_MIN_MINUTES || minutes > BOOKING_MAX_MINUTES) return null;
  return siteWallTimeToUtc(ymd, parsed.hour, parsed.minute);
}
