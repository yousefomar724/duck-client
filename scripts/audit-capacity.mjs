/**
 * Read-only capacity diagnosis. This file intentionally contains no database
 * write calls, so a typo in its arguments cannot trigger the occupancy backfill.
 *
 * Usage:
 *   node --env-file=.env.local scripts/audit-capacity.mjs
 *     -> supplier list + fleet, global legacy census, busiest upcoming days
 *   node --env-file=.env.local scripts/audit-capacity.mjs --supplier=<objectId> --date=2026-09-12
 *     -> full per-slot breakdown for one supplier and day (--date defaults to today)
 */
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;
const BOOKING_MIN_MINUTES = 6 * 60;
const BOOKING_MAX_MINUTES = 18 * 60 + 30;
const BOOKING_SLOT_MINUTES = 30;
const LEGACY_FALLBACK_SPAN_MINUTES = 60;
const SITE_TIME_ZONE = 'Africa/Cairo';
const RESOURCE_TYPES = ['kayak', 'water_cycle', 'sup'];
const OCCUPYING_STATUSES = ['PENDING', 'CONFIRMED', 'SUCCESS', 'PAID', 'ARRIVED', 'IN_PROGRESS'];

const TripSchema = new Schema(
  {
    is_tour: Boolean,
    activity_minutes: Number,
    duration: Number,
    duration_text: Schema.Types.Mixed,
    deletedAt: Date,
  },
  { collection: 'trips' },
);
const BookingSchema = new Schema(
  {
    trip_id: Schema.Types.ObjectId,
    supplier_id: Schema.Types.ObjectId,
    status: String,
    resource_type: String,
    quantity: Number,
    booking_date: Date,
    starts_at: Date,
    ends_at: Date,
    occupancy_slots: [Date],
    occupancy_version: Number,
    deletedAt: Date,
  },
  { collection: 'bookings' },
);
const StorageSchema = new Schema(
  {
    supplier_id: Schema.Types.ObjectId,
    resources: { type: Map, of: Number },
    maintenance: { type: Map, of: Number },
    turnaround_minutes: Number,
    deletedAt: Date,
  },
  { collection: 'supplier_storages' },
);
const SupplierSchema = new Schema(
  { name: Schema.Types.Mixed, deletedAt: Date },
  { collection: 'suppliers' },
);

const Trip = models.CapacityAuditTrip || model('CapacityAuditTrip', TripSchema);
const Booking = models.CapacityAuditBooking || model('CapacityAuditBooking', BookingSchema);
const SupplierStorage =
  models.CapacityAuditStorage || model('CapacityAuditStorage', StorageSchema);
const Supplier = models.CapacityAuditSupplier || model('CapacityAuditSupplier', SupplierSchema);

function siteParts(date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: SITE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const map = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour === '24' ? '0' : map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function toSiteYmd(date) {
  const p = siteParts(date);
  return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function siteWallTimeToUtc(ymd, hour = 0, minute = 0, second = 0, ms = 0) {
  const [year, month, day] = ymd.split('-').map(Number);
  let utc = Date.UTC(year, month - 1, day, hour - 2, minute, second, ms);
  for (let i = 0; i < 4; i++) {
    const parts = siteParts(new Date(utc));
    const got = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const want = Date.UTC(year, month - 1, day, hour, minute, second);
    const delta = want - got;
    if (delta === 0) break;
    utc += delta;
  }
  return new Date(utc);
}

function addSiteDays(ymd, days) {
  const [year, month, day] = ymd.split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day + days));
  return `${String(probe.getUTCFullYear()).padStart(4, '0')}-${String(probe.getUTCMonth() + 1).padStart(2, '0')}-${String(probe.getUTCDate()).padStart(2, '0')}`;
}

function startOfSiteDay(ymd) {
  return siteWallTimeToUtc(ymd, 0, 0, 0, 0);
}

function siteMinutesOfDay(date) {
  const p = siteParts(date);
  return p.hour * 60 + p.minute;
}

function operatingSlotsForDay(ymd) {
  const slots = [];
  for (let m = BOOKING_MIN_MINUTES; m <= BOOKING_MAX_MINUTES; m += BOOKING_SLOT_MINUTES) {
    slots.push(siteWallTimeToUtc(ymd, Math.floor(m / 60), m % 60));
  }
  return slots;
}

function wallMinutesToUtc(ymd, totalMinutes) {
  const dayLength = 24 * 60;
  const dayOffset = Math.floor(totalMinutes / dayLength);
  let minutes = totalMinutes - dayOffset * dayLength;
  if (minutes < 0) minutes += dayLength;
  return siteWallTimeToUtc(addSiteDays(ymd, dayOffset), Math.floor(minutes / 60), minutes % 60);
}

function computeOccupancy({ startsAt, blocksWholeDays, durationDays, activityMinutes, turnaroundMinutes }) {
  if (blocksWholeDays) {
    const startYmd = toSiteYmd(startsAt);
    const days = Math.max(1, Math.floor(durationDays) || 1);
    const occupancy_slots = [];
    for (let i = 0; i < days; i++) {
      occupancy_slots.push(...operatingSlotsForDay(addSiteDays(startYmd, i)));
    }
    return {
      starts_at: occupancy_slots[0] ?? siteWallTimeToUtc(startYmd, 6, 0),
      ends_at: startOfSiteDay(addSiteDays(startYmd, days)),
      occupancy_slots,
    };
  }

  const startYmd = toSiteYmd(startsAt);
  const startMinutes = siteMinutesOfDay(startsAt);
  const alignedStart = Math.floor(startMinutes / BOOKING_SLOT_MINUTES) * BOOKING_SLOT_MINUTES;
  const span = Math.max(0, activityMinutes) + Math.max(0, turnaroundMinutes);
  const endAbs = startMinutes + span;
  const alignedEnd =
    endAbs % BOOKING_SLOT_MINUTES === 0
      ? endAbs
      : Math.ceil(endAbs / BOOKING_SLOT_MINUTES) * BOOKING_SLOT_MINUTES;
  const occupancy_slots = [];
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

function arg(name) {
  return process.argv.slice(2).find((value) => value.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
}

function mapRecord(value) {
  if (!value) return {};
  return value instanceof Map ? Object.fromEntries(value) : { ...value };
}

function legacyWindow(booking) {
  const start = booking.starts_at ? new Date(booking.starts_at) : null;
  const end = booking.ends_at ? new Date(booking.ends_at) : null;
  if (start && end && end > start) return { start: start.getTime(), end: end.getTime(), kind: 'window' };
  const minutes = Math.floor(siteMinutesOfDay(booking.booking_date) / 30) * 30;
  const base = wallMinutesToUtc(toSiteYmd(booking.booking_date), minutes).getTime();
  return { start: base, end: base + LEGACY_FALLBACK_SPAN_MINUTES * 60_000, kind: 'fallback' };
}

function iso(value) {
  return value ? new Date(value).toISOString() : '';
}

/**
 * Supplier-independent overview, printed when --supplier is omitted so the
 * operator can discover which supplier and date are worth drilling into.
 */
async function overview() {
  console.log('0. Suppliers (pass one id back as --supplier=)');
  const suppliers = await Supplier.find({ deletedAt: null }).limit(100).lean();
  const storages = await SupplierStorage.find({ deletedAt: null }).lean();
  const bySupplier = new Map(storages.map((row) => [String(row.supplier_id), row]));
  console.log('supplier_id\tname\tresources\tmaintenance\tturnaround_minutes');
  for (const supplier of suppliers) {
    const storage = bySupplier.get(String(supplier._id));
    const name =
      typeof supplier.name === 'string'
        ? supplier.name
        : (supplier.name?.ar ?? supplier.name?.en ?? '');
    console.log(
      [
        String(supplier._id),
        JSON.stringify(name),
        storage ? JSON.stringify(mapRecord(storage.resources)) : 'NO STORAGE DOC',
        storage ? JSON.stringify(mapRecord(storage.maintenance)) : '',
        storage?.turnaround_minutes ?? '',
      ].join('\t'),
    );
  }

  console.log('\n0b. Global legacy census (rows the occupancy backfill has not touched)');
  const legacyBase = { occupancy_version: { $ne: 1 }, deletedAt: null };
  const [legacyTotal, occupying, neverReleased] = await Promise.all([
    Booking.countDocuments(legacyBase),
    Booking.countDocuments({ ...legacyBase, status: { $in: OCCUPYING_STATUSES } }),
    Booking.countDocuments({
      ...legacyBase,
      status: { $in: OCCUPYING_STATUSES },
      ends_at: null,
    }),
  ]);
  console.log(`total\t${legacyTotal}`);
  console.log(`occupying\t${occupying}`);
  console.log(`occupying_ends_at_null\t${neverReleased}`);
  if (occupying > 0) {
    console.log(
      '\nVERDICT cause (a): run `node --env-file=.env.local scripts/backfill-occupancy.mjs --dry-run` then without the flag.',
    );
  }

  console.log('\n0c. Busiest upcoming days (pass one back as --date=)');
  const busiest = await Booking.aggregate([
    {
      $match: {
        deletedAt: null,
        status: { $in: OCCUPYING_STATUSES },
        booking_date: { $gte: startOfSiteDay(toSiteYmd(new Date())) },
      },
    },
    {
      $group: {
        _id: {
          supplier_id: '$supplier_id',
          ymd: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$booking_date',
              timezone: SITE_TIME_ZONE,
            },
          },
        },
        bookings: { $sum: 1 },
        units: { $sum: '$quantity' },
        legacy: { $sum: { $cond: [{ $ne: ['$occupancy_version', 1] }, 1, 0] } },
      },
    },
    { $sort: { units: -1 } },
    { $limit: 20 },
  ]);
  console.log('supplier_id\tdate\tbookings\tunits\tlegacy_rows');
  for (const row of busiest) {
    console.log(
      [String(row._id.supplier_id), row._id.ymd, row.bookings, row.units, row.legacy].join('\t'),
    );
  }
}

async function main() {
  const supplierArg = arg('supplier');
  const ymd = arg('date') ?? toSiteYmd(new Date());
  if (supplierArg && !mongoose.isValidObjectId(supplierArg)) {
    throw new Error(`--supplier is not a valid ObjectId: ${supplierArg}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    throw new Error(`--date must be YYYY-MM-DD, got: ${ymd}`);
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI);

  if (!supplierArg) {
    await overview();
    console.log(
      '\nRe-run with --supplier=<id> --date=YYYY-MM-DD from the tables above for the per-slot breakdown.',
    );
    await mongoose.disconnect();
    return;
  }

  const supplierId = new mongoose.Types.ObjectId(supplierArg);
  const dayStart = startOfSiteDay(ymd);
  const dayEnd = startOfSiteDay(addSiteDays(ymd, 1));
  const slots = operatingSlotsForDay(ymd);
  const [supplier, storage] = await Promise.all([
    Supplier.findById(supplierId).lean(),
    SupplierStorage.findOne({ supplier_id: supplierId, deletedAt: null }).lean(),
  ]);
  const resources = mapRecord(storage?.resources);
  const maintenance = mapRecord(storage?.maintenance);

  console.log('1. Storage');
  console.log(`supplier\t${supplierArg}\t${JSON.stringify(supplier?.name ?? '')}`);
  console.log(`resources\t${JSON.stringify(resources)}`);
  console.log(`maintenance\t${JSON.stringify(maintenance)}`);
  console.log('type\tpresent\traw\tmaintenance\teffective');
  const effective = new Map();
  for (const rt of RESOURCE_TYPES) {
    const present = Object.prototype.hasOwnProperty.call(resources, rt);
    const raw = Number(resources[rt] ?? 0);
    const down = Number(maintenance[rt] ?? 0);
    const limit = Math.max(0, raw - down);
    effective.set(rt, present ? limit : undefined);
    console.log(`${rt}\t${present ? 'yes' : 'NO'}\t${raw}\t${down}\t${limit}`);
  }
  console.log(`turnaround_minutes\t${storage?.turnaround_minutes ?? 0}`);

  console.log('\n2. Global legacy census');
  const legacyBase = { occupancy_version: { $ne: 1 }, deletedAt: null };
  const [legacyTotal, statusRows, occupyingLegacy, neverReleased, neverReleasedRange] = await Promise.all([
    Booking.countDocuments(legacyBase),
    Booking.aggregate([
      { $match: legacyBase },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Booking.countDocuments({ ...legacyBase, status: { $in: OCCUPYING_STATUSES } }),
    Booking.countDocuments({ ...legacyBase, status: { $in: OCCUPYING_STATUSES }, ends_at: null }),
    Booking.aggregate([
      { $match: { ...legacyBase, status: { $in: OCCUPYING_STATUSES }, ends_at: null } },
      { $group: { _id: null, min: { $min: '$booking_date' }, max: { $max: '$booking_date' } } },
    ]),
  ]);
  console.log(`total\t${legacyTotal}`);
  for (const row of statusRows) console.log(`status.${row._id ?? 'missing'}\t${row.count}`);
  console.log(`occupying\t${occupyingLegacy}`);
  console.log(`occupying_ends_at_null\t${neverReleased}`);
  console.log(`never_released_min\t${iso(neverReleasedRange[0]?.min)}`);
  console.log(`never_released_max\t${iso(neverReleasedRange[0]?.max)}`);

  console.log('\n3. Bookings touching the day');
  const bookings = await Booking.find({
    supplier_id: supplierId,
    deletedAt: null,
    $or: [
      { booking_date: { $gte: dayStart, $lt: dayEnd } },
      { occupancy_slots: { $gte: dayStart, $lt: dayEnd } },
      { starts_at: { $lt: dayEnd }, ends_at: { $gt: dayStart } },
    ],
  })
    .sort({ booking_date: 1, _id: 1 })
    .lean();
  console.log('_id\ttrip_id\tstatus\tresource_type\tquantity\toccupancy_version\tbooking_date\tstarts_at\tends_at\toccupancy_slots.length\tfirstSlot\tlastSlot');
  for (const booking of bookings) {
    const bookingSlots = booking.occupancy_slots ?? [];
    console.log([
      booking._id,
      booking.trip_id,
      booking.status,
      booking.resource_type,
      booking.quantity,
      booking.occupancy_version ?? '',
      iso(booking.booking_date),
      iso(booking.starts_at),
      iso(booking.ends_at),
      bookingSlots.length,
      iso(bookingSlots[0]),
      iso(bookingSlots.at(-1)),
    ].join('\t'));
  }

  console.log('\n4. Trips involved');
  const tripIds = [...new Set(bookings.map((booking) => String(booking.trip_id)))].map(
    (id) => new mongoose.Types.ObjectId(id),
  );
  const trips = tripIds.length ? await Trip.find({ _id: { $in: tripIds } }).lean() : [];
  const turnaround = Number(storage?.turnaround_minutes ?? 0);
  console.log(
    'trip_id\tname\tis_tour\tactivity_minutes\tduration\tspan_minutes\tslots_spanned\tnote',
  );
  let longSpan = false;
  // Counted from stored occupancy below, not from trip flags.
  for (const trip of trips) {
    const explicit = Number(trip.activity_minutes) > 0 ? Number(trip.activity_minutes) : null;
    // computeOccupancy ignores activity_minutes when is_tour is true: a tour
    // occupies EVERY operating slot of EVERY day it spans.
    const isTour = Boolean(trip.is_tour);
    let note = '';
    // A tour's `duration` is the number of HOURS the customer picks, so its
    // occupancy is a window like any other booking. Bookings written before
    // that fix still carry whole-day occupancy_slots until the backfill runs.
    const hours = isTour
      ? Math.max(1, Math.floor(Number(trip.duration) || 0) || 1)
      : null;
    const activity = isTour
      ? hours * 60
      : (explicit ?? (Number(trip.duration) > 0 ? Number(trip.duration) * 60 : 60));
    const span = activity + turnaround;
    const spanned = Math.ceil(span / BOOKING_SLOT_MINUTES);
    if (isTour) {
      note = `is_tour: window = ${hours}h from the booked time (customer-picked hours)`;
    }
    if (spanned >= 8) longSpan = true;
    const name =
      typeof trip.name === 'string' ? trip.name : (trip.name?.en ?? trip.name?.ar ?? '');
    console.log(
      [
        String(trip._id),
        JSON.stringify(name),
        isTour,
        trip.activity_minutes ?? '',
        trip.duration ?? '',
        span,
        spanned,
        note,
      ].join('\t'),
    );
  }

  const wholeDayTour = bookings.filter(
    (booking) =>
      OCCUPYING_STATUSES.includes(booking.status) &&
      (booking.occupancy_slots?.length ?? 0) >= slots.length,
  ).length;

  console.log('\n5. Per-slot table');
  const withSlots = bookings.filter((booking) => (booking.occupancy_slots?.length ?? 0) > 0 && OCCUPYING_STATUSES.includes(booking.status));
  const slotless = bookings.filter((booking) => (booking.occupancy_slots?.length ?? 0) === 0 && OCCUPYING_STATUSES.includes(booking.status));
  console.log('slot\tresource_type\tunits_versioned\tunits_legacy_window\tunits_legacy_dayblock\tlimit\tremaining_today\tremaining_after_fix');
  for (const slot of slots) {
    for (const rt of RESOURCE_TYPES) {
      const key = slot.getTime();
      const unitsVersioned = withSlots
        .filter((booking) => booking.occupancy_version === 1 && booking.resource_type === rt && booking.occupancy_slots.some((value) => new Date(value).getTime() === key))
        .reduce((sum, booking) => sum + Number(booking.quantity ?? 0), 0);
      const unitsSlotsAnyVersion = withSlots
        .filter((booking) => booking.resource_type === rt && booking.occupancy_slots.some((value) => new Date(value).getTime() === key))
        .reduce((sum, booking) => sum + Number(booking.quantity ?? 0), 0);
      const unitsLegacyWindow = slotless
        .filter((booking) => booking.resource_type === rt)
        .filter((booking) => {
          const window = legacyWindow(booking);
          return window.start <= key && key < window.end;
        })
        .reduce((sum, booking) => sum + Number(booking.quantity ?? 0), 0);
      const unitsLegacyDayblock = bookings
        .filter((booking) => booking.occupancy_version !== 1 && booking.resource_type === rt && toSiteYmd(booking.booking_date) === ymd && OCCUPYING_STATUSES.includes(booking.status))
        .reduce((sum, booking) => sum + Number(booking.quantity ?? 0), 0);
      const limit = effective.get(rt);
      const ceiling = limit ?? 0;
      console.log([
        `${String(siteParts(slot).hour).padStart(2, '0')}:${String(siteParts(slot).minute).padStart(2, '0')}`,
        rt,
        unitsVersioned,
        unitsLegacyWindow,
        unitsLegacyDayblock,
        limit ?? 'missing',
        Math.max(0, ceiling - unitsVersioned - unitsLegacyDayblock),
        Math.max(0, ceiling - unitsSlotsAnyVersion - unitsLegacyWindow),
      ].join('\t'));
    }
  }

  console.log('\n6. Verdict');
  const zeroCapacity = RESOURCE_TYPES.some((rt) => effective.get(rt) == null || effective.get(rt) === 0);
  const causes = [];
  if (occupyingLegacy > 0) causes.push('cause (a): occupying legacy rows');
  if (zeroCapacity) causes.push('cause (b): missing or zero effective capacity');
  if (longSpan) causes.push('cause (c): a rental spans at least 8 slots');
  if (wholeDayTour) {
    causes.push(
      `cause (d): ${wholeDayTour} booking(s) still carry whole-day occupancy_slots — run scripts/backfill-occupancy.mjs --force`,
    );
  }
  console.log(causes.length ? causes.join('; ') : 'none of causes (a), (b), or (c) detected');

  // Keep the copied helper reachable so drift checks can compare it with the
  // backfill without turning this script into a writer.
  void computeOccupancy;
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
