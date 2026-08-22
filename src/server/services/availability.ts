import { Types } from 'mongoose';
import { startOfSiteDay, toSiteYmd, zonedEndOfDayExclusive } from '@/lib/time';
import { Booking } from '../models/booking';
import { SupplierStorage } from '../models/supplier-storage';

export class NoAvailabilityError extends Error {}

/**
 * Sums booked quantity for a supplier/resource/day. Statuses PENDING,
 * CONFIRMED, SUCCESS reflect currently "held" resources.
 *
 * Fixes a Go-API bug (#4): the original query also counted COMPLETED
 * bookings, so the 24h-release cron never actually freed the resources it
 * marked complete. COMPLETED is intentionally excluded here.
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
    status: { $in: ['PENDING', 'CONFIRMED', 'SUCCESS'] },
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

/** Reproduces `domains.CheckAvailability` exactly, including the error message format. */
export async function checkAvailability(
  supplierId: string,
  resourceType: string,
  bookingDate: Date,
  requestedQty: number,
  excludeBookingId?: string,
): Promise<void> {
  const storage = await SupplierStorage.findOne({ supplier_id: supplierId });
  if (!storage) throw new Error('supplier storage not configured');

  const limit = storage.resources.get(resourceType);
  if (limit === undefined) {
    throw new NoAvailabilityError('resource type not found in supplier storage');
  }

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
}
