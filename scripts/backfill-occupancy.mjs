/**
 * Backfill trip.activity_minutes and booking occupancy fields, then create
 * capacity indexes. Idempotent unless --force.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-occupancy.mjs --audit
 *   node --env-file=.env.local scripts/backfill-occupancy.mjs --dry-run
 *   node --env-file=.env.local scripts/backfill-occupancy.mjs
 *   node --env-file=.env.local scripts/backfill-occupancy.mjs --force
 *
 * Occupancy math must stay in sync with src/lib/booking/occupancy.ts.
 */
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const args = new Set(process.argv.slice(2));
const AUDIT = args.has('--audit');
const DRY_RUN = args.has('--dry-run');
const FORCE = args.has('--force');

const BOOKING_MIN_MINUTES = 6 * 60;
const BOOKING_MAX_MINUTES = 18 * 60 + 30;
const BOOKING_SLOT_MINUTES = 30;
const OCCUPANCY_VERSION = 1;
const SITE_TIME_ZONE = 'Africa/Cairo';

const LocalizedSchema = new Schema({ en: String, ar: String }, { _id: false });

const TripSchema = new Schema(
  {
    is_tour: { type: Boolean, default: false },
    duration: { type: Number, default: 1 },
    duration_text: { type: LocalizedSchema, default: () => ({ en: '', ar: '' }) },
    activity_minutes: { type: Number, default: null },
  },
  { collection: 'trips' },
);

const BookingSchema = new Schema(
  {
    trip_id: { type: Schema.Types.ObjectId, ref: 'Trip' },
    supplier_id: { type: Schema.Types.ObjectId },
    booking_date: Date,
    duration: { type: Number, default: 0 },
    starts_at: Date,
    ends_at: Date,
    occupancy_slots: [Date],
    occupancy_version: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { collection: 'bookings' },
);

const StorageSchema = new Schema(
  {
    supplier_id: Schema.Types.ObjectId,
    turnaround_minutes: { type: Number, default: 0 },
  },
  { collection: 'supplier_storages' },
);

const Trip = models.Trip || model('Trip', TripSchema);
const Booking = models.Booking || model('Booking', BookingSchema);
const SupplierStorage = models.SupplierStorage || model('SupplierStorage', StorageSchema);

const ARABIC_INDIC = /[\u0660-\u0669]/g;
const EASTERN_INDIC = /[\u06F0-\u06F9]/g;

function normalizeDigits(text) {
  return text
    .replace(ARABIC_INDIC, (ch) => String(ch.charCodeAt(0) - 0x0660))
    .replace(EASTERN_INDIC, (ch) => String(ch.charCodeAt(0) - 0x06f0));
}

function parseDurationHours(text) {
  if (!text || !String(text).trim()) return null;
  const matches = normalizeDigits(String(text)).match(/\d+(?:\.\d+)?/g);
  if (!matches) return null;
  let max = -Infinity;
  for (const raw of matches) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > max) max = n;
  }
  if (!Number.isFinite(max) || max <= 0) return null;
  return Math.max(1, Math.ceil(max));
}

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

function computeOccupancy({ startsAt, isTour, durationDays, activityMinutes, turnaroundMinutes }) {
  if (isTour) {
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

function heuristicActivityMinutes(trip) {
  if (typeof trip.activity_minutes === 'number' && trip.activity_minutes > 0) {
    return trip.activity_minutes;
  }
  const parsed = parseDurationHours(trip.duration_text?.en ?? '') ?? parseDurationHours(trip.duration_text?.ar ?? '');
  if (parsed) return parsed * 60;
  if (typeof trip.duration === 'number' && trip.duration > 0) return trip.duration * 60;
  return 60;
}

async function audit() {
  const trips = await Trip.find({ deletedAt: null }).lean();
  console.log('trip_id\tis_tour\tduration\tduration_text.ar\tduration_text.en\tparsed_hours\tactivity_minutes\tbookings');
  for (const trip of trips) {
    const parsed =
      parseDurationHours(trip.duration_text?.en ?? '') ?? parseDurationHours(trip.duration_text?.ar ?? '');
    const bookings = await Booking.countDocuments({ trip_id: trip._id, deletedAt: null });
    console.log(
      [
        trip._id,
        trip.is_tour,
        trip.duration,
        JSON.stringify(trip.duration_text?.ar ?? ''),
        JSON.stringify(trip.duration_text?.en ?? ''),
        parsed,
        trip.activity_minutes ?? '',
        bookings,
      ].join('\t'),
    );
  }
  console.log(`\n${trips.length} trips audited`);
}

async function backfill() {
  const trips = await Trip.find({ deletedAt: null });
  let tripsUpdated = 0;
  const tripMinutes = new Map();

  for (const trip of trips) {
    const minutes = heuristicActivityMinutes(trip);
    tripMinutes.set(String(trip._id), minutes);
    if (FORCE || trip.activity_minutes == null || trip.activity_minutes <= 0) {
      if (!DRY_RUN) {
        trip.activity_minutes = minutes;
        await trip.save();
      }
      tripsUpdated += 1;
    } else {
      tripMinutes.set(String(trip._id), trip.activity_minutes);
    }
  }
  console.log(`Trips activity_minutes: ${tripsUpdated} ${DRY_RUN ? '(dry-run)' : 'updated'}`);

  const turnaroundBySupplier = new Map();
  const storages = await SupplierStorage.find({ deletedAt: null }).lean();
  for (const s of storages) {
    turnaroundBySupplier.set(String(s.supplier_id), s.turnaround_minutes ?? 0);
  }

  const cursor = Booking.find({ deletedAt: null }).cursor();
  let ops = [];
  let bookingsUpdated = 0;
  let skipped = 0;

  for await (const booking of cursor) {
    if (!FORCE && booking.occupancy_version === OCCUPANCY_VERSION) {
      skipped += 1;
      continue;
    }
    const tripId = String(booking.trip_id);
    const activityMinutes = tripMinutes.get(tripId) ?? 60;
    const trip = trips.find((t) => String(t._id) === tripId);
    const occupancy = computeOccupancy({
      startsAt: booking.booking_date,
      isTour: Boolean(trip?.is_tour),
      durationDays: trip?.is_tour ? booking.duration || 1 : 1,
      activityMinutes,
      turnaroundMinutes: turnaroundBySupplier.get(String(booking.supplier_id)) ?? 0,
    });
    ops.push({
      updateOne: {
        filter: { _id: booking._id },
        update: {
          $set: {
            starts_at: occupancy.starts_at,
            ends_at: occupancy.ends_at,
            occupancy_slots: occupancy.occupancy_slots,
            occupancy_version: OCCUPANCY_VERSION,
          },
        },
      },
    });
    bookingsUpdated += 1;
    if (ops.length >= 500) {
      if (!DRY_RUN) await Booking.bulkWrite(ops);
      ops = [];
    }
  }
  if (ops.length > 0 && !DRY_RUN) await Booking.bulkWrite(ops);
  console.log(`Bookings occupancy: ${bookingsUpdated} ${DRY_RUN ? '(dry-run)' : 'updated'}, ${skipped} skipped`);

  if (!DRY_RUN) {
    const coll = mongoose.connection.collection('bookings');
    const specs = [
      { key: { supplier_id: 1, resource_type: 1, status: 1, occupancy_slots: 1 } },
      { key: { supplier_id: 1, booking_date: 1 } },
      { key: { status: 1, ends_at: 1 } },
      { key: { supplier_id: 1, created_at: -1 } },
      { key: { phone_number: 1, created_at: -1 } },
      { key: { trip_id: 1, booking_date: 1 } },
    ];
    for (const spec of specs) {
      await coll.createIndex(spec.key, { background: true });
    }
    console.log('Indexes ensured (background: true)');
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
  if (AUDIT) {
    await audit();
  } else {
    await backfill();
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
