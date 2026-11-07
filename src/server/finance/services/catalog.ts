import type { Model } from 'mongoose';
import type { ActivityTypeItem, OfficialTripItem, ScheduledPriceChange } from '@/lib/finance/erp-types';
import type { TripDoc } from '../models/settings';
import { logAudit } from './audit';
import { nextPlainNumber } from './counters';
import { PERMISSIONS, hasPermission } from '../auth/permissions';
import { FinanceError, badRequest, notFound, so, type FinCtx } from './context';
import { cleanUpdates, genId, nowIso, num, toOut, toOutList, today } from './util';

// --- Official trips catalog -------------------------------------------------

export async function getOfficialTrips(ctx: FinCtx): Promise<OfficialTripItem[]> {
  const rows = await ctx.m.Trip.find().sort({ createdAt: 1, _id: 1 }).lean().session(ctx.session);
  return toOutList<OfficialTripItem>(rows);
}

const nullablePrice = (v: unknown) => (v === undefined || v === null || v === '' ? null : num(v));

/** Trips mirrored from Duck Aswan take their prices from Duck; they cannot be deleted here either. */
export const DUCK_TRIP_PRICES_READ_ONLY =
  'This trip is synced from Duck: its prices are changed in Duck admin and it cannot be deleted here.';

function assertNoDuckPriceChange(trip: Pick<TripDoc, 'egyptianPrice' | 'foreignerPrice' | 'isForeignerPricePending'>, updates: Record<string, unknown>) {
  const changed =
    (updates.egyptianPrice !== undefined && num(updates.egyptianPrice) !== trip.egyptianPrice) ||
    (updates.foreignerPrice !== undefined && nullablePrice(updates.foreignerPrice) !== trip.foreignerPrice) ||
    (updates.isForeignerPricePending !== undefined && Boolean(updates.isForeignerPricePending) !== trip.isForeignerPricePending);
  if (changed) throw badRequest(DUCK_TRIP_PRICES_READ_ONLY);
}

export async function createOfficialTrip(ctx: FinCtx, data: Record<string, unknown>): Promise<OfficialTripItem> {
  const str = (k: string, fallback: string) => (typeof data[k] === 'string' && data[k] ? String(data[k]) : fallback);
  const tripCode = typeof data.tripCode === 'string' && data.tripCode ? data.tripCode : await nextPlainNumber(ctx, 'TRIP', 3);
  const [trip] = await ctx.m.Trip.create(
    [
      {
        tripCode,
        name: str('name', 'New Water Activity Tour'),
        nameAr: str('nameAr', 'جولة مائية جديدة'),
        destination: str('destination', 'Elephantine Island — Aswan'),
        operationalLocation: str('operationalLocation', 'Elephantine Island Dock'),
        activityType: str('activityType', 'Kayak'),
        description: str('description', ''),
        descriptionAr: str('descriptionAr', ''),
        egyptianPrice: num(data.egyptianPrice),
        foreignerPrice: nullablePrice(data.foreignerPrice),
        isForeignerPricePending: Boolean(data.isForeignerPricePending),
        pricingUnit: str('pricingUnit', 'Per Person'),
        currency: 'EGP',
        duration: str('duration', '2 Hours'),
        captainIncluded: data.captainIncluded !== undefined ? Boolean(data.captainIncluded) : true,
        equipmentRequired: Array.isArray(data.equipmentRequired)
          ? data.equipmentRequired.map(String)
          : ['Kayak', 'ISO Life Jacket', 'Paddle'],
        maxParticipants: num(data.maxParticipants) || 12,
        minParticipants: num(data.minParticipants) || 1,
        bookingAvailability: str('bookingAvailability', 'Available'),
        operationalStatus: str('operationalStatus', 'Active'),
        websiteDisplayStatus: str('websiteDisplayStatus', 'Published'),
        websiteTripId: typeof data.websiteTripId === 'string' && data.websiteTripId ? data.websiteTripId : undefined,
        internalNotes: str('internalNotes', ''),
        priceAuditTrail: [],
        scheduledPriceChanges: [],
      },
    ],
    so(ctx),
  );
  await logAudit(ctx, 'CREATE_TRIP', 'OfficialTrip', trip._id, `Created trip ${trip.name} (${trip.destination})`);
  return toOut<OfficialTripItem>(trip);
}

export async function updateOfficialTrip(ctx: FinCtx, id: string, updates: Record<string, unknown>): Promise<OfficialTripItem> {
  const trip = await ctx.m.Trip.findById(id).session(ctx.session);
  if (!trip) throw notFound(`Trip ${id} not found.`);
  if (trip.duckSynced) assertNoDuckPriceChange(trip, updates);

  const egyptianChanged = updates.egyptianPrice !== undefined && num(updates.egyptianPrice) !== trip.egyptianPrice;
  const foreignerChanged = updates.foreignerPrice !== undefined && nullablePrice(updates.foreignerPrice) !== trip.foreignerPrice;
  if ((egyptianChanged || foreignerChanged) && !hasPermission(ctx.actor.permissions, PERMISSIONS.pricingApprove)) {
    throw new FinanceError(403, 'Changing a catalog price needs pricing approval permission.');
  }
  if (egyptianChanged || foreignerChanged) {
    trip.priceAuditTrail.unshift({
      id: genId('pa'),
      date: today(),
      changedBy: ctx.actor.name,
      oldEgyptianPrice: trip.egyptianPrice,
      newEgyptianPrice: updates.egyptianPrice !== undefined ? num(updates.egyptianPrice) : trip.egyptianPrice,
      oldForeignerPrice: trip.foreignerPrice,
      newForeignerPrice:
        updates.foreignerPrice !== undefined && updates.foreignerPrice !== null
          ? num(updates.foreignerPrice)
          : trip.foreignerPrice,
      reason: typeof updates.priceChangeReason === 'string' ? updates.priceChangeReason : 'Catalog price adjustment',
    });
  }

  const patch = cleanUpdates<TripDoc>(updates, [
    'priceAuditTrail',
    'scheduledPriceChanges',
    'priceChangeReason',
    'currency',
    'duckSynced',
    // A mirrored trip stays linked to its Duck trip.
    ...(trip.duckSynced ? ['websiteTripId'] : []),
  ]);
  if (patch.egyptianPrice !== undefined) patch.egyptianPrice = num(patch.egyptianPrice);
  if ('foreignerPrice' in patch) patch.foreignerPrice = nullablePrice(patch.foreignerPrice);
  trip.set(patch);
  await trip.save(so(ctx));
  await logAudit(ctx, 'UPDATE_TRIP', 'OfficialTrip', trip._id, `Updated trip ${trip.name} (${trip.tripCode})`);
  return toOut<OfficialTripItem>(trip);
}

/** Deleted for good: nothing re-seeds demo trips any more. */
export async function deleteOfficialTrip(ctx: FinCtx, id: string): Promise<void> {
  const existing = await ctx.m.Trip.findById(id).select('duckSynced').lean().session(ctx.session);
  if (existing?.duckSynced) throw badRequest(DUCK_TRIP_PRICES_READ_ONLY);
  const trip = await ctx.m.Trip.findByIdAndDelete(id, so(ctx));
  if (!trip) throw notFound(`Trip ${id} not found.`);
  await logAudit(ctx, 'DELETE_TRIP', 'OfficialTrip', id, `Deleted trip ${trip.name}`);
}

export async function schedulePriceChange(ctx: FinCtx, tripId: string, change: Record<string, unknown>): Promise<ScheduledPriceChange> {
  const trip = await ctx.m.Trip.findById(tripId).session(ctx.session);
  if (!trip) throw notFound(`Trip ${tripId} not found.`);
  if (trip.duckSynced) throw badRequest(DUCK_TRIP_PRICES_READ_ONLY);
  const effectiveDate = typeof change.effectiveDate === 'string' && change.effectiveDate ? change.effectiveDate : today();
  const item: ScheduledPriceChange = {
    id: genId('spc'),
    effectiveDate,
    egyptianPrice: num(change.egyptianPrice) || trip.egyptianPrice,
    foreignerPrice: change.foreignerPrice !== undefined ? nullablePrice(change.foreignerPrice) : trip.foreignerPrice,
    status: 'Pending',
    createdAt: nowIso(),
    createdBy: ctx.actor.name,
  };
  trip.scheduledPriceChanges.push(item);
  await trip.save(so(ctx));
  await logAudit(ctx, 'SCHEDULE_PRICE_CHANGE', 'OfficialTrip', tripId, `Scheduled price change for ${trip.name} on ${effectiveDate}`);
  return item;
}

// --- Activity types ---------------------------------------------------------

export async function getActivityTypes(ctx: FinCtx): Promise<ActivityTypeItem[]> {
  const rows = await ctx.m.ActivityType.find().sort({ sortOrder: 1, createdAt: 1 }).lean().session(ctx.session);
  return toOutList<ActivityTypeItem>(rows);
}

type OrderedModel = 'ActivityType' | 'Service' | 'CustomRole' | 'TourType' | 'Captain';

/** Appends to the end of an ordered list (the ERP's `list.push`). */
export async function nextSortOrder(ctx: FinCtx, name: OrderedModel): Promise<number> {
  const model = ctx.m[name] as unknown as Model<{ sortOrder: number }>;
  const last = await model.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean().session(ctx.session);
  return (last?.sortOrder ?? 0) + 1;
}

export async function createActivityType(ctx: FinCtx, data: Record<string, unknown>): Promise<ActivityTypeItem> {
  const name = typeof data.name === 'string' && data.name ? data.name : 'New Activity';
  const [act] = await ctx.m.ActivityType.create(
    [
      {
        name,
        nameAr: typeof data.nameAr === 'string' && data.nameAr ? data.nameAr : 'نشاط جديد',
        description: typeof data.description === 'string' ? data.description : '',
        active: data.active !== undefined ? Boolean(data.active) : true,
        sortOrder: await nextSortOrder(ctx, 'ActivityType'),
      },
    ],
    so(ctx),
  );
  await logAudit(ctx, 'CREATE_ACTIVITY_TYPE', 'ActivityType', act._id, `Created activity type ${act.name}`);
  return toOut<ActivityTypeItem>(act);
}

export async function updateActivityType(ctx: FinCtx, id: string, updates: unknown): Promise<ActivityTypeItem> {
  const act = await ctx.m.ActivityType.findById(id).session(ctx.session);
  if (!act) throw notFound(`Activity type ${id} not found.`);
  act.set(cleanUpdates(updates, ['sortOrder']));
  if (!act.name) throw badRequest('Activity name is required.');
  await act.save(so(ctx));
  await logAudit(ctx, 'UPDATE_ACTIVITY_TYPE', 'ActivityType', id, `Updated activity type ${act.name}`);
  return toOut<ActivityTypeItem>(act);
}

export async function deleteActivityType(ctx: FinCtx, id: string): Promise<void> {
  const act = await ctx.m.ActivityType.findByIdAndDelete(id, so(ctx));
  if (!act) throw notFound(`Activity type ${id} not found.`);
  await logAudit(ctx, 'DELETE_ACTIVITY_TYPE', 'ActivityType', id, `Deleted activity type ${act.name}`);
}
