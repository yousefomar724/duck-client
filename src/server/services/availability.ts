import { Types } from 'mongoose';
import { startOfSiteDay, toSiteYmd, zonedEndOfDayExclusive } from '@/lib/time';
import {
  isHourlyCapacityEnabled,
  occupancySlotsEqual,
  slotHHMM,
} from '@/lib/booking/occupancy';
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

/**
 * Sums booked quantity for a supplier/resource/day.
 *
 * @deprecated Prefer `countActiveBySlots`. Kept as a day-granular wrapper for
 * one release while `OPS_HOURLY_CAPACITY` is rolled out.
 */
export async function countActiveByResourceAndDate(
  supplierId: string,
  resourceType: string,
  bookingDate: Date,
  excludeBookingId?: string,
): Promise<number> {
  const ymd = toSiteYmd(bookingDate);
  const startOfDay = startOfSiteDay(ymd);
  const endOfDay = zonedEndOfDayExclusive(ymd);

  const match: Record<string, unknown> = {
    supplier_id: new Types.ObjectId(supplierId),
    resource_type: resourceType,
    booking_date: { $gte: startOfDay, $lt: endOfDay },
    status: { $in: [...OCCUPYING_STATUSES] },
  };

  if (excludeBookingId) {
    match._id = { $ne: new Types.ObjectId(excludeBookingId) };
  }

  const result = await Booking.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$quantity' } } },
  ]);

  return result[0]?.total ?? 0;
}

export async function countActiveBySlots(
  supplierId: string,
  resourceType: string,
  slots: Date[],
  excludeBookingId?: string,
): Promise<{ perSlot: Map<number, number>; peak: number }> {
  const perSlot = new Map<number, number>();
  for (const slot of slots) perSlot.set(slot.getTime(), 0);
  if (slots.length === 0) return { perSlot, peak: 0 };

  const match: Record<string, unknown> = {
    supplier_id: new Types.ObjectId(supplierId),
    resource_type: resourceType,
    status: { $in: [...OCCUPYING_STATUSES] },
    occupancy_version: 1,
    occupancy_slots: { $in: slots },
  };
  if (excludeBookingId) {
    match._id = { $ne: new Types.ObjectId(excludeBookingId) };
  }

  const aggregated: { _id: Date; total: number }[] = await Booking.aggregate([
    { $match: match },
    { $unwind: '$occupancy_slots' },
    { $match: { occupancy_slots: { $in: slots } } },
    { $group: { _id: '$occupancy_slots', total: { $sum: '$quantity' } } },
  ]);

  for (const row of aggregated) {
    const key = new Date(row._id).getTime();
    if (perSlot.has(key)) perSlot.set(key, row.total);
  }

  const dayBlockMatch: Record<string, unknown> = {
    supplier_id: new Types.ObjectId(supplierId),
    resource_type: resourceType,
    status: { $in: [...OCCUPYING_STATUSES] },
    occupancy_version: { $ne: 1 },
  };
  if (excludeBookingId) {
    dayBlockMatch._id = { $ne: new Types.ObjectId(excludeBookingId) };
  }
  const ymds = [...new Set(slots.map((s) => toSiteYmd(s)))];
  const dayOr = ymds.map((ymd) => ({
    booking_date: { $gte: startOfSiteDay(ymd), $lt: zonedEndOfDayExclusive(ymd) },
  }));
  if (dayOr.length > 0) {
    dayBlockMatch.$or = dayOr;
    const blockers = await Booking.find(dayBlockMatch).select('quantity booking_date');
    for (const blocker of blockers) {
      const ymd = toSiteYmd(blocker.booking_date);
      for (const slot of slots) {
        if (toSiteYmd(slot) === ymd) {
          perSlot.set(slot.getTime(), (perSlot.get(slot.getTime()) ?? 0) + blocker.quantity);
        }
      }
    }
  }

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
 * Hourly occupancy check when `OPS_HOURLY_CAPACITY=1`; otherwise day-granular.
 *
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

  if (!isHourlyCapacityEnabled()) {
    const limit = storage.resources.get(resourceType);
    if (limit === undefined) {
      throw new NoAvailabilityError('resource type not found in supplier storage');
    }
    const bookingDate = occupancySlots[0];
    if (!bookingDate) return;
    const currentBooked = await countActiveByResourceAndDate(
      supplierId,
      resourceType,
      bookingDate,
      excludeBookingId,
    );
    if (currentBooked + requestedQty > limit) {
      throw new NoAvailabilityError(
        `no availability for the requested resource: requested ${requestedQty} but only ${
          limit - currentBooked
        } available (limit: ${limit}, booked: ${currentBooked})`,
      );
    }
    return;
  }

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

    // Legacy day-blocked bookings (occupancy_version !== 1) are counted by
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
  if (!isHourlyCapacityEnabled()) return;
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
