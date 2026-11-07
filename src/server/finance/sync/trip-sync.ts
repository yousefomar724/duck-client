import { Types } from 'mongoose';
import type { OfficialTripItem } from '@/lib/finance/erp-types';
import { Destination } from '@/server/models/destination';
import { Trip } from '@/server/models/trip';
import { logAudit } from '../services/audit';
import { nextPlainNumber } from '../services/counters';
import { so, type FinCtx } from '../services/context';
import { genId, today } from '../services/util';
import type { TripDoc as ErpTripDoc } from '../models/settings';
import { isDuckSupplier } from './config';
import { tripActivity, tripName } from './mapping';

/** The raw Duck trip document (soft-deleted ones included). */
export interface RawDuckTrip {
  _id: Types.ObjectId;
  supplier_id: Types.ObjectId;
  name?: { en?: string; ar?: string };
  description?: { en?: string; ar?: string };
  meeting_point?: { en?: string; ar?: string };
  duration_text?: { en?: string; ar?: string };
  activities?: string[];
  is_tour?: boolean;
  duration?: number;
  price?: number;
  foreigner_price?: number;
  guide_price?: number;
  guide_mandatory?: boolean;
  max_guests?: number;
  min_guests?: number;
  status?: string;
  public_status?: string;
  currency?: string;
  destination_ids?: Types.ObjectId[];
  deletedAt?: Date | null;
}

function oid(id: unknown): Types.ObjectId | null {
  const s = String(id ?? '');
  return Types.ObjectId.isValid(s) && /^[0-9a-f]{24}$/i.test(s) ? new Types.ObjectId(s) : null;
}

/** Reads through the raw collection so soft-deleted trips are found too. */
export async function loadDuckTrip(id: unknown): Promise<RawDuckTrip | null> {
  const _id = oid(id);
  if (!_id) return null;
  return (await Trip.collection.findOne({ _id })) as RawDuckTrip | null;
}

const plain = (html?: string) =>
  (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);

async function destinationLabel(trip: RawDuckTrip): Promise<string> {
  const ids = (trip.destination_ids ?? []).map(oid).filter((x): x is Types.ObjectId => x !== null);
  if (!ids.length) return 'Aswan';
  const rows = (await Destination.collection.find({ _id: { $in: ids } }).toArray()) as { name?: { en?: string; ar?: string } }[];
  const names = rows.map((d) => d.name?.en?.trim() || d.name?.ar?.trim()).filter(Boolean);
  return names.length ? names.join(', ') : 'Aswan';
}

/** The ERP catalog fields a Duck trip owns. */
async function mirroredFields(trip: RawDuckTrip) {
  const deleted = Boolean(trip.deletedAt);
  return {
    name: tripName(trip),
    nameAr: trip.name?.ar?.trim() || tripName(trip),
    destination: await destinationLabel(trip),
    operationalLocation: trip.meeting_point?.en?.trim() || trip.meeting_point?.ar?.trim() || '',
    activityType: tripActivity(trip).label,
    description: plain(trip.description?.en),
    descriptionAr: plain(trip.description?.ar),
    egyptianPrice: trip.price ?? 0,
    foreignerPrice: trip.foreigner_price ?? 0,
    isForeignerPricePending: false,
    pricingUnit: (trip.is_tour ? 'Per Hour' : 'Per Person') as OfficialTripItem['pricingUnit'],
    duration: trip.duration_text?.en?.trim() || (trip.is_tour ? `${trip.duration ?? 1} h` : ''),
    maxParticipants: trip.max_guests ?? 12,
    minParticipants: trip.min_guests ?? 1,
    operationalStatus: (deleted || trip.status === 'inactive' ? 'Inactive' : 'Active') as OfficialTripItem['operationalStatus'],
    websiteDisplayStatus: (deleted ? 'Hidden' : trip.public_status === 'coming-soon' ? 'Draft' : 'Published') as OfficialTripItem['websiteDisplayStatus'],
    bookingAvailability: (deleted || trip.status === 'inactive' ? 'Unavailable' : 'Available') as OfficialTripItem['bookingAvailability'],
  };
}

export interface MirroredTrip {
  id: string;
  name: string;
  destination: string;
  activityType: string;
  changed: boolean;
}

/**
 * Upserts the ERP catalog row for a Duck Aswan trip, keyed by
 * `websiteTripId`. Prices follow Duck (`price` → egyptianPrice,
 * `foreigner_price` → foreignerPrice); a price change is written to the
 * trip's price audit trail. An existing hand-made row with the same
 * `websiteTripId` is adopted.
 */
export async function mirrorDuckTrip(ctx: FinCtx, trip: RawDuckTrip): Promise<MirroredTrip> {
  const websiteTripId = String(trip._id);
  const fields = await mirroredFields(trip);
  const existing = await ctx.m.Trip.findOne({ websiteTripId }).session(ctx.session);

  if (!existing) {
    const tripCode = await nextPlainNumber(ctx, 'TRIP', 3);
    const [created] = await ctx.m.Trip.create(
      [
        {
          ...fields,
          tripCode,
          currency: 'EGP',
          captainIncluded: true,
          equipmentRequired: [],
          websiteTripId,
          duckSynced: true,
          internalNotes: 'Mirrored from Duck. Prices are managed in Duck admin.',
          priceAuditTrail: [],
          scheduledPriceChanges: [],
        },
      ],
      so(ctx),
    );
    await logAudit(ctx, 'DUCK_SYNC_TRIP', 'OfficialTrip', created._id, `Mirrored Duck trip ${fields.name} (${tripCode})`);
    return { id: created._id, name: fields.name, destination: fields.destination, activityType: fields.activityType, changed: true };
  }

  const priceChanged = existing.egyptianPrice !== fields.egyptianPrice || existing.foreignerPrice !== fields.foreignerPrice;
  const changedKeys = (Object.keys(fields) as (keyof typeof fields)[]).filter(
    (k) => (existing as unknown as Record<string, unknown>)[k] !== fields[k],
  );
  if (!existing.duckSynced) changedKeys.push('duckSynced' as keyof typeof fields);
  if (!changedKeys.length) {
    return { id: existing._id, name: fields.name, destination: fields.destination, activityType: fields.activityType, changed: false };
  }

  if (priceChanged) {
    existing.priceAuditTrail.unshift({
      id: genId('pa'),
      date: today(),
      changedBy: ctx.actor.name,
      oldEgyptianPrice: existing.egyptianPrice,
      newEgyptianPrice: fields.egyptianPrice,
      oldForeignerPrice: existing.foreignerPrice,
      newForeignerPrice: fields.foreignerPrice,
      reason: 'Price changed in Duck admin',
    });
  }
  existing.set({ ...fields, duckSynced: true } as Partial<ErpTripDoc>);
  await existing.save(so(ctx));
  await logAudit(
    ctx,
    'DUCK_SYNC_TRIP',
    'OfficialTrip',
    existing._id,
    `Updated Duck trip ${fields.name} (${existing.tripCode}): ${changedKeys.join(', ')}`,
  );
  return { id: existing._id, name: fields.name, destination: fields.destination, activityType: fields.activityType, changed: true };
}

/** Every Duck Aswan trip, soft-deleted ones included (they mirror as Inactive / Hidden). */
export async function loadDuckAswanTrips(supplierId: string): Promise<RawDuckTrip[]> {
  const rows = (await Trip.collection.find({ supplier_id: new Types.ObjectId(supplierId) }).toArray()) as RawDuckTrip[];
  return rows.filter((t) => isDuckSupplier(t.supplier_id));
}
