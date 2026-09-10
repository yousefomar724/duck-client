import { Types } from 'mongoose';
import {
  siteMinutesOfDay,
  siteWallTimeToUtc,
  startOfSiteDay,
  toSiteYmd,
  zonedEndOfDayExclusive,
} from '@/lib/time';
import { occupancySlotsEqual, slotHHMM } from '@/lib/booking/occupancy';
import { BOOKING_SLOT_MINUTES } from '@/lib/booking/schedule';
import { ALLOWED_RESOURCE_TYPES } from '../models/supplier-storage';
import { Booking, type BookingDoc } from '../models/booking';
import { SupplierStorage, type SupplierStorageDoc } from '../models/supplier-storage';

export class NoAvailabilityError extends Error {
  readonly code = 'NO_AVAILABILITY' as const;
  constructor(message: string) {
    super(message);
    this.name = 'NoAvailabilityError';
  }
}

export const OCCUPYING_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SUCCESS',
  'PAID',
  'ARRIVED',
  'IN_PROGRESS',
] as const;

const RELEASE_STATUSES = ['CONFIRMED', 'SUCCESS', 'PAID', 'ARRIVED', 'IN_PROGRESS'] as const;

function mapGet(
  map: Map<string, number> | Record<string, number> | undefined | null,
  key: string,
): number {
  if (!map) return 0;
  if (map instanceof Map) return map.get(key) ?? 0;
  return map[key] ?? 0;
}

export function effectiveResourceLimit(
  storage: SupplierStorageDoc,
  resourceType: string,
): number | undefined {
  const raw = mapGet(storage.resources, resourceType);
  if (storage.resources instanceof Map) {
    if (!storage.resources.has(resourceType)) return undefined;
  } else if (
    storage.resources &&
    typeof storage.resources === 'object' &&
    !(resourceType in (storage.resources as Record<string, number>))
  ) {
    return undefined;
  }
  const maintenance = mapGet(storage.maintenance, resourceType);
  return Math.max(0, raw - maintenance);
}

function resourceLimitOrThrow(storage: SupplierStorageDoc, resourceType: string): number {
  const limit = effectiveResourceLimit(storage, resourceType);
  if (limit === undefined) {
    throw new NoAvailabilityError('resource type not found in supplier storage');
  }
  return limit;
}

/** Effective per-type limits for one supplier. `undefined` = type not configured. */
export async function resourceLimitsForSupplier(
  supplierId: string,
): Promise<Map<string, number | undefined>> {
  const storage = await SupplierStorage.findOne({ supplier_id: supplierId });
  const limits = new Map<string, number | undefined>();
  for (const resourceType of ALLOWED_RESOURCE_TYPES) {
    limits.set(
      resourceType,
      storage ? effectiveResourceLimit(storage, resourceType) : undefined,
    );
  }
  return limits;
}

export async function releaseEndedBookings(now = new Date()): Promise<number> {
  const result = await Booking.updateMany(
    {
      status: { $in: [...RELEASE_STATUSES] },
      ends_at: { $lt: now },
    },
    { $set: { status: 'COMPLETED' } },
  );
  return result.modifiedCount;
}

export const LEGACY_FALLBACK_SPAN_MINUTES = 60;

type LegacyOccupancyRow = {
  resource_type?: string;
  quantity: number;
  booking_date: Date;
  starts_at?: Date | null;
  ends_at?: Date | null;
};

function legacyWindow(row: LegacyOccupancyRow): { start: number; end: number } {
  const startsAt = row.starts_at ? new Date(row.starts_at) : null;
  const endsAt = row.ends_at ? new Date(row.ends_at) : null;
  if (
    startsAt &&
    endsAt &&
    Number.isFinite(startsAt.getTime()) &&
    Number.isFinite(endsAt.getTime()) &&
    endsAt > startsAt
  ) {
    return { start: startsAt.getTime(), end: endsAt.getTime() };
  }

  const bookingDate = new Date(row.booking_date);
  const alignedMinutes =
    Math.floor(siteMinutesOfDay(bookingDate) / BOOKING_SLOT_MINUTES) *
    BOOKING_SLOT_MINUTES;
  const start = siteWallTimeToUtc(
    toSiteYmd(bookingDate),
    Math.floor(alignedMinutes / 60),
    alignedMinutes % 60,
  ).getTime();
  return { start, end: start + LEGACY_FALLBACK_SPAN_MINUTES * 60_000 };
}

/** True when a slot-less legacy row occupies at least one requested slot. */
export function legacyBookingTouchesSlots(
  row: LegacyOccupancyRow,
  slots: Date[],
): boolean {
  const window = legacyWindow(row);
  return slots.some((slot) => {
    const time = slot.getTime();
    return window.start <= time && time < window.end;
  });
}

export async function countActiveBySlotsMulti(
  supplierId: string,
  resourceTypes: string[],
  slots: Date[],
  excludeBookingId?: string,
): Promise<Map<string, Map<number, number>>> {
  const uniqueTypes = [...new Set(resourceTypes)];
  const uniqueSlots = [...new Map(slots.map((slot) => [slot.getTime(), slot])).values()];
  const result = new Map<string, Map<number, number>>();
  for (const resourceType of uniqueTypes) {
    result.set(
      resourceType,
      new Map(uniqueSlots.map((slot) => [slot.getTime(), 0])),
    );
  }
  if (uniqueTypes.length === 0 || uniqueSlots.length === 0) return result;

  const baseMatch: Record<string, unknown> = {
    supplier_id: new Types.ObjectId(supplierId),
    resource_type: { $in: uniqueTypes },
    status: { $in: [...OCCUPYING_STATUSES] },
  };
  if (excludeBookingId) {
    baseMatch._id = { $ne: new Types.ObjectId(excludeBookingId) };
  }

  const rowsWithSlots: { _id: { rt: string; slot: Date }; total: number }[] =
    await Booking.aggregate([
      { $match: { ...baseMatch, occupancy_slots: { $in: uniqueSlots } } },
      { $unwind: '$occupancy_slots' },
      { $match: { occupancy_slots: { $in: uniqueSlots } } },
      {
        $group: {
          _id: { rt: '$resource_type', slot: '$occupancy_slots' },
          total: { $sum: '$quantity' },
        },
      },
    ]);

  for (const row of rowsWithSlots) {
    const perSlot = result.get(row._id.rt);
    const key = new Date(row._id.slot).getTime();
    if (perSlot?.has(key)) perSlot.set(key, row.total);
  }

  const ymds = uniqueSlots.map(toSiteYmd).sort();
  const dayStart = startOfSiteDay(ymds[0]);
  const dayEnd = zonedEndOfDayExclusive(ymds[ymds.length - 1]);
  const legacyRows = await Booking.find({
    ...baseMatch,
    $and: [
      {
        $or: [
          { occupancy_slots: { $exists: false } },
          { occupancy_slots: { $size: 0 } },
          { occupancy_slots: null },
        ],
      },
      {
        $or: [
          { starts_at: { $lt: dayEnd }, ends_at: { $gt: dayStart } },
          { booking_date: { $gte: dayStart, $lt: dayEnd } },
        ],
      },
    ],
  })
    .select('resource_type quantity booking_date starts_at ends_at')
    .lean<LegacyOccupancyRow[]>();

  for (const row of legacyRows) {
    if (!row.resource_type) continue;
    const perSlot = result.get(row.resource_type);
    if (!perSlot) continue;
    const window = legacyWindow(row);
    for (const slot of uniqueSlots) {
      const key = slot.getTime();
      if (window.start <= key && key < window.end) {
        perSlot.set(key, (perSlot.get(key) ?? 0) + row.quantity);
      }
    }
  }

  return result;
}

export async function countActiveBySlots(
  supplierId: string,
  resourceType: string,
  slots: Date[],
  excludeBookingId?: string,
): Promise<{ perSlot: Map<number, number>; peak: number }> {
  const multi = await countActiveBySlotsMulti(
    supplierId,
    [resourceType],
    slots,
    excludeBookingId,
  );
  const perSlot = multi.get(resourceType) ?? new Map<number, number>();

  let peak = 0;
  for (const count of perSlot.values()) {
    if (count > peak) peak = count;
  }
  return { perSlot, peak };
}

function arabicSlotConflict(slot: Date, requestedQty: number, available: number): string {
  return `لا تتوفر سعة كافية عند الساعة ${slotHHMM(slot)} (المطلوب ${requestedQty}، المتاح ${Math.max(0, available)})`;
}

/**
 * Race-guard escalation (not built): a `resource_slot_usage` collection with
 * conditional `$inc` would make concurrent creates atomic without the
 * insert-then-verify / ordered-loser-rollback used here. MongoMemoryServer
 * in CI is standalone, so `session.withTransaction` is unavailable.
 */
export async function checkAvailability(
  supplierId: string,
  resourceType: string,
  occupancySlots: Date[],
  requestedQty: number,
  excludeBookingId?: string,
): Promise<void> {
  await releaseEndedBookings();

  const storage = await SupplierStorage.findOne({ supplier_id: supplierId });
  if (!storage) throw new Error('supplier storage not configured');

  const limit = resourceLimitOrThrow(storage, resourceType);
  if (occupancySlots.length === 0) return;

  const { perSlot } = await countActiveBySlots(
    supplierId,
    resourceType,
    occupancySlots,
    excludeBookingId,
  );

  for (const slot of occupancySlots) {
    const booked = perSlot.get(slot.getTime()) ?? 0;
    if (booked + requestedQty > limit) {
      throw new NoAvailabilityError(arabicSlotConflict(slot, requestedQty, limit - booked));
    }
  }
}

async function orderedLoserCheck(booking: BookingDoc, limit: number): Promise<void> {
  const slots = booking.occupancy_slots ?? [];
  if (!booking.resource_type || slots.length === 0) return;

  const { perSlot } = await countActiveBySlots(
    booking.supplier_id.toString(),
    booking.resource_type,
    slots,
  );

  for (const slot of slots) {
    const booked = perSlot.get(slot.getTime()) ?? 0;
    if (booked <= limit) continue;

    const occupants = await Booking.find({
      supplier_id: booking.supplier_id,
      resource_type: booking.resource_type,
      status: { $in: [...OCCUPYING_STATUSES] },
      occupancy_slots: slot,
    })
      .select('quantity created_at')
      .sort({ created_at: 1, _id: 1 });

    // Legacy window-blocked bookings without occupancy_slots are counted by
    // countActiveBySlots but carry no occupancy_slots to order by. They predate
    // every writer here, so they consume the limit first.
    const occupantTotal = occupants.reduce((sum, o) => sum + o.quantity, 0);
    let used = Math.max(0, booked - occupantTotal);

    // Prefix sum up to and including this booking. Losing depends only on the
    // writers ahead of us in (created_at, _id) order — never on whether a
    // sibling has already rolled back — so N concurrent inserts converge on the
    // same set of survivors in a single pass, with no sleep between them.
    for (const occupant of occupants) {
      used += occupant.quantity;
      if (String(occupant._id) !== String(booking._id)) continue;
      if (used > limit) {
        throw new NoAvailabilityError(
          arabicSlotConflict(slot, booking.quantity, Math.max(0, limit - (used - occupant.quantity))),
        );
      }
      break;
    }
  }
}

/**
 * After insert (or edit save): the writers whose cumulative quantity crosses
 * the per-slot limit roll back. Ordered by `(created_at, _id)`, so the verdict
 * for a given booking depends only on the writers ahead of it — no mutual
 * abort, and no dependence on a sibling having already rolled back.
 *
 * Residual race: if a booking with an earlier `created_at` acknowledges its
 * insert *after* a later one has already run this check, the later one can
 * survive a slot it should have lost. Closing that needs an atomic reservation
 * (see the `resource_slot_usage` note on `checkAvailability`); MongoMemoryServer
 * is standalone in CI, so `session.withTransaction` is unavailable here.
 */
export async function verifyOccupancy(booking: BookingDoc): Promise<void> {
  if (!booking.resource_type || !booking.occupancy_slots?.length) return;

  const storage = await SupplierStorage.findOne({ supplier_id: booking.supplier_id });
  if (!storage) throw new Error('supplier storage not configured');
  const limit = resourceLimitOrThrow(storage, booking.resource_type);

  await orderedLoserCheck(booking, limit);
}

export function occupancyChanged(
  before: { quantity: number; resource_type?: string; occupancy_slots?: Date[] },
  after: { quantity: number; resource_type?: string; occupancy_slots?: Date[] },
): boolean {
  return (
    before.quantity !== after.quantity ||
    (before.resource_type ?? '') !== (after.resource_type ?? '') ||
    !occupancySlotsEqual(before.occupancy_slots, after.occupancy_slots)
  );
}
