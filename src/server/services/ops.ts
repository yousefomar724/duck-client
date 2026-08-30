import { Types } from 'mongoose';
import { Booking } from '../models/booking';
import { ALLOWED_RESOURCE_TYPES, SupplierStorage } from '../models/supplier-storage';
import { Trip } from '../models/trip';
import { OpsNotificationState } from '../models/ops-notification-state';
import {
  addSiteDays,
  isValidYmd,
  startOfSiteDay,
  toSiteYmd,
  zonedEndOfDayExclusive,
} from '@/lib/time';
import {
  hourLabels,
  operatingSlotsForDay,
  parseHHMM,
  slotHHMM,
  slotUtc,
  slotsForHour,
} from '@/lib/booking/occupancy';
import { REVENUE_STATUSES } from '@/lib/bookings/stats';
import { paymentState, remainingAmount } from '@/lib/bookings/payment';
import { bandFromPct, heatFromBookingCount, utilisationPct } from '@/components/dashboard/ops/heat';
import { bookingNationality } from '@/components/dashboard/ops/ops-strings';
import {
  OCCUPYING_STATUSES,
  effectiveResourceLimit,
  releaseEndedBookings,
} from './availability';

const LOAD_EXCLUDED = [
  'CANCELLED',
  'FAILED',
  'REFUNDED',
  'REFUND_PENDING',
  'REFUND_FAILED',
  'NO_SHOW',
] as const;

function oid(id: string) {
  return new Types.ObjectId(id);
}

function scopeFilter(supplierId: string | null): Record<string, unknown> {
  return supplierId ? { supplier_id: oid(supplierId) } : {};
}

function mapToRecord(map: Map<string, number> | Record<string, number> | undefined): Record<string, number> {
  if (!map) return {};
  if (map instanceof Map) return Object.fromEntries(map.entries());
  return { ...map };
}

export interface CapacityBreakdown {
  total: number;
  per_resource: { type: string; capacity: number; maintenance: number }[];
}

export async function loadCapacity(supplierId: string | null): Promise<CapacityBreakdown> {
  const filter = supplierId ? { supplier_id: oid(supplierId) } : {};
  const storages = await SupplierStorage.find(filter);
  const byType = new Map<string, { capacity: number; maintenance: number }>();
  for (const rt of ALLOWED_RESOURCE_TYPES) {
    byType.set(rt, { capacity: 0, maintenance: 0 });
  }
  for (const storage of storages) {
    for (const rt of ALLOWED_RESOURCE_TYPES) {
      const resources = mapToRecord(storage.resources);
      const maintenance = mapToRecord(storage.maintenance);
      if (!(rt in resources) && storage.resources instanceof Map && !storage.resources.has(rt)) {
        continue;
      }
      const limit = effectiveResourceLimit(storage, rt);
      if (limit === undefined) continue;
      const current = byType.get(rt) ?? { capacity: 0, maintenance: 0 };
      current.capacity += resources[rt] ?? 0;
      current.maintenance += maintenance[rt] ?? 0;
      byType.set(rt, current);
    }
  }
  const per_resource = [...byType.entries()]
    .filter(([, v]) => v.capacity > 0 || v.maintenance > 0)
    .map(([type, v]) => ({
      type,
      capacity: Math.max(0, v.capacity - v.maintenance),
      maintenance: v.maintenance,
    }));
  const total = per_resource.reduce((sum, r) => sum + r.capacity, 0);
  return { total, per_resource };
}

function monthBounds(yearMonth: string): { start: Date; end: Date; days: string[] } {
  const [year, month] = yearMonth.split('-').map(Number);
  const startYmd = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const days: string[] = [];
  for (let cursor = startYmd; cursor < nextMonth; cursor = addSiteDays(cursor, 1)) {
    days.push(cursor);
  }
  return { start: startOfSiteDay(startYmd), end: startOfSiteDay(nextMonth), days };
}

export async function getOpsCalendar(
  supplierId: string | null,
  yearMonth: string,
  peak = false,
) {
  await releaseEndedBookings();
  const { start, end, days } = monthBounds(yearMonth);
  const match = {
    ...scopeFilter(supplierId),
    booking_date: { $gte: start, $lt: end },
    status: { $nin: [...LOAD_EXCLUDED] },
  };

  const grouped: {
    _id: string;
    bookings: number;
    guests: number;
    units: number;
    revenue: number;
  }[] = await Booking.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$booking_date',
            timezone: 'Africa/Cairo',
          },
        },
        bookings: { $sum: 1 },
        guests: { $sum: { $add: ['$local_guests', '$foreigner_guests'] } },
        units: { $sum: '$quantity' },
        revenue: {
          $sum: {
            $cond: [{ $in: ['$status', [...REVENUE_STATUSES]] }, '$amount', 0],
          },
        },
      },
    },
  ]);

  const byDay = new Map(grouped.map((row) => [row._id, row]));
  let peakByDay = new Map<string, number>();
  if (peak) {
    const peakRows: { _id: { ymd: string; slot: Date }; units: number }[] = await Booking.aggregate([
      {
        $match: {
          ...scopeFilter(supplierId),
          occupancy_version: 1,
          occupancy_slots: { $gte: start, $lt: end },
          status: { $in: [...OCCUPYING_STATUSES] },
        },
      },
      { $unwind: '$occupancy_slots' },
      { $match: { occupancy_slots: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: {
            ymd: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$occupancy_slots',
                timezone: 'Africa/Cairo',
              },
            },
            slot: '$occupancy_slots',
          },
          units: { $sum: '$quantity' },
        },
      },
    ]);
    peakByDay = new Map();
    for (const row of peakRows) {
      const current = peakByDay.get(row._id.ymd) ?? 0;
      if (row.units > current) peakByDay.set(row._id.ymd, row.units);
    }
  }

  const capacity = await loadCapacity(supplierId);
  return {
    month: yearMonth,
    capacity,
    days: days.map((ymd) => {
      const row = byDay.get(ymd);
      const bookings = row?.bookings ?? 0;
      return {
        ymd,
        bookings,
        guests: row?.guests ?? 0,
        units: row?.units ?? 0,
        revenue: row?.revenue ?? 0,
        heat: heatFromBookingCount(bookings),
        ...(peak ? { peak_units: peakByDay.get(ymd) ?? 0 } : {}),
      };
    }),
  };
}

export async function getOpsDay(supplierId: string | null, ymd: string) {
  await releaseEndedBookings();
  if (!isValidYmd(ymd)) throw new Error('Invalid date');
  const start = startOfSiteDay(ymd);
  const end = zonedEndOfDayExclusive(ymd);
  const capacity = await loadCapacity(supplierId);

  const [totals] = await Booking.aggregate([
    {
      $match: {
        ...scopeFilter(supplierId),
        booking_date: { $gte: start, $lt: end },
        status: { $nin: [...LOAD_EXCLUDED] },
      },
    },
    {
      $group: {
        _id: null,
        bookings: { $sum: 1 },
        guests: { $sum: { $add: ['$local_guests', '$foreigner_guests'] } },
        units: { $sum: '$quantity' },
        revenue: {
          $sum: {
            $cond: [{ $in: ['$status', [...REVENUE_STATUSES]] }, '$amount', 0],
          },
        },
      },
    },
  ]);

  const slotRows: { _id: Date; bookings: number; guests: number; units: number }[] =
    await Booking.aggregate([
      {
        $match: {
          ...scopeFilter(supplierId),
          occupancy_version: 1,
          occupancy_slots: { $gte: start, $lt: end },
          status: { $nin: [...LOAD_EXCLUDED] },
        },
      },
      { $unwind: '$occupancy_slots' },
      { $match: { occupancy_slots: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: '$occupancy_slots',
          bookings: { $sum: 1 },
          guests: { $sum: { $add: ['$local_guests', '$foreigner_guests'] } },
          units: {
            $sum: {
              $cond: [
                { $in: ['$status', [...OCCUPYING_STATUSES]] },
                '$quantity',
                0,
              ],
            },
          },
        },
      },
    ]);

  const bySlot = new Map(
    slotRows.map((row) => [Math.floor(new Date(row._id).getTime() / 60_000), row]),
  );

  const hours = hourLabels().map((hour) => {
    const h = Number(hour.slice(0, 2));
    const buckets = slotsForHour(ymd, h);
    let bookings = 0;
    let guests = 0;
    let units = 0;
    for (const slot of buckets) {
      const row = bySlot.get(Math.floor(slot.getTime() / 60_000));
      if (!row) continue;
      bookings = Math.max(bookings, row.bookings);
      guests = Math.max(guests, row.guests);
      units = Math.max(units, row.units);
    }
    const pct = utilisationPct(units, capacity.total);
    return {
      hour,
      bookings,
      guests,
      units,
      capacity: capacity.total,
      pct,
      band: bandFromPct(pct),
    };
  });

  return {
    date: ymd,
    capacity,
    summary: {
      bookings: totals?.bookings ?? 0,
      guests: totals?.guests ?? 0,
      units: totals?.units ?? 0,
      revenue: totals?.revenue ?? 0,
    },
    hours,
  };
}

export async function getOpsHour(supplierId: string | null, ymd: string, time: string) {
  await releaseEndedBookings();
  const parsed = parseHHMM(time);
  const slot = slotUtc(ymd, time);
  if (!parsed || !slot) throw new Error('Invalid time');
  const buckets = slotsForHour(ymd, parsed.hour);
  const capacity = await loadCapacity(supplierId);

  const bookings = await Booking.find({
    ...scopeFilter(supplierId),
    occupancy_version: 1,
    occupancy_slots: { $in: buckets },
    status: { $nin: [...LOAD_EXCLUDED] },
  })
    .populate({ path: 'trip_id', select: 'name is_tour duration activity_minutes' })
    .sort({ booking_date: 1, created_at: 1 });

  const occupying = bookings.filter((b) =>
    (OCCUPYING_STATUSES as readonly string[]).includes(b.status),
  );
  const units = occupying.reduce((sum, b) => sum + b.quantity, 0);
  const pct = utilisationPct(units, capacity.total);

  return {
    date: ymd,
    time,
    capacity,
    units,
    pct,
    band: bandFromPct(pct),
    bookings: bookings.map((doc) => {
      const json = doc.toJSON() as Record<string, unknown>;
      return {
        ...json,
        payment_state: paymentState(doc),
        remaining: remainingAmount(doc),
        nationality: bookingNationality(doc),
      };
    }),
  };
}

export async function getOpsSummary(supplierId: string | null, ymd: string, userId: string) {
  await releaseEndedBookings();
  const day = await getOpsDay(supplierId, ymd);
  const now = new Date();
  const nowYmd = toSiteYmd(now);
  const nowHH = slotHHMM(now);

  let nextSlot: { hour: string; bookings: number } | null = null;
  if (ymd === nowYmd) {
    nextSlot =
      day.hours.find((h) => h.hour >= nowHH.slice(0, 2).padStart(2, '0') + ':00' && h.bookings > 0) ??
      null;
    if (nextSlot) nextSlot = { hour: nextSlot.hour, bookings: nextSlot.bookings };
  } else {
    const first = day.hours.find((h) => h.bookings > 0);
    nextSlot = first ? { hour: first.hour, bookings: first.bookings } : null;
  }

  const start = startOfSiteDay(ymd);
  const end = zonedEndOfDayExclusive(ymd);
  const upcoming = await Booking.countDocuments({
    ...scopeFilter(supplierId),
    booking_date: { $gte: start, $lt: end },
    status: { $in: ['CONFIRMED', 'PAID', 'SUCCESS', 'ARRIVED', 'IN_PROGRESS'] },
  });

  const top = await Booking.find({
    ...scopeFilter(supplierId),
    booking_date: { $gte: start, $lt: end },
    status: { $nin: [...LOAD_EXCLUDED] },
  })
    .populate({ path: 'trip_id', select: 'name is_tour duration activity_minutes' })
    .sort({ booking_date: 1 })
    .limit(8);

  const notifications = await listOpsNotifications(supplierId, userId, ymd);
  const unread = notifications.filter((n) => !n.read).length;

  return {
    date: ymd,
    summary: day.summary,
    hours: day.hours,
    capacity: day.capacity,
    next_slot: nextSlot,
    upcoming,
    unread_notifications: unread,
    top_bookings: top.map((b) => b.toJSON()),
  };
}

export async function getPublicSlotAvailability(tripId: string, ymd: string, resourceType?: string) {
  await releaseEndedBookings();
  const trip = await Trip.findById(tripId);
  if (!trip) return null;
  const supplierId = trip.supplier_id.toString();
  const capacity = await loadCapacity(supplierId);
  const daySlots = operatingSlotsForDay(ymd);
  const types = resourceType ? [resourceType] : capacity.per_resource.map((r) => r.type);

  const remainingByType: Record<string, Record<number, number>> = {};
  for (const rt of types) {
    const cap = capacity.per_resource.find((r) => r.type === rt)?.capacity ?? 0;
    remainingByType[rt] = {};
    for (const slot of daySlots) remainingByType[rt][slot.getTime()] = cap;
  }

  if (types.length > 0) {
    const rows: { _id: { rt: string; slot: Date }; units: number }[] = await Booking.aggregate([
      {
        $match: {
          supplier_id: oid(supplierId),
          resource_type: { $in: types },
          occupancy_version: 1,
          occupancy_slots: { $in: daySlots },
          status: { $in: [...OCCUPYING_STATUSES] },
        },
      },
      { $unwind: '$occupancy_slots' },
      { $match: { occupancy_slots: { $in: daySlots } } },
      {
        $group: {
          _id: { rt: '$resource_type', slot: '$occupancy_slots' },
          units: { $sum: '$quantity' },
        },
      },
    ]);
    for (const row of rows) {
      const key = new Date(row._id.slot).getTime();
      const rt = row._id.rt;
      if (remainingByType[rt] && remainingByType[rt][key] != null) {
        remainingByType[rt][key] = Math.max(0, remainingByType[rt][key] - row.units);
      }
    }
  }

  return {
    date: ymd,
    slots: daySlots.map((slot) => {
      const remaining: Record<string, number> = {};
      let remaining_total = 0;
      for (const rt of types) {
        const n = remainingByType[rt]?.[slot.getTime()] ?? 0;
        remaining[rt] = n;
        remaining_total += n;
      }
      return { time: slotHHMM(slot), remaining, remaining_total };
    }),
  };
}

export async function getReportsOverview(
  supplierId: string | null,
  from: string,
  to: string,
) {
  const start = startOfSiteDay(from);
  const end = zonedEndOfDayExclusive(to);
  const match = {
    ...scopeFilter(supplierId),
    booking_date: { $gte: start, $lt: end },
  };

  const [facet] = await Booking.aggregate([
    { $match: match },
    {
      $facet: {
        by_day: [
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$booking_date',
                  timezone: 'Africa/Cairo',
                },
              },
              bookings: { $sum: 1 },
              revenue: {
                $sum: {
                  $cond: [{ $in: ['$status', [...REVENUE_STATUSES]] }, '$amount', 0],
                },
              },
            },
          },
          { $sort: { _id: 1 } },
        ],
        popular_activities: [
          { $group: { _id: '$trip_id', bookings: { $sum: 1 }, units: { $sum: '$quantity' } } },
          { $sort: { bookings: -1 } },
          { $limit: 8 },
        ],
        peak_hours: [
          { $match: { occupancy_version: 1, occupancy_slots: { $ne: [] } } },
          { $unwind: '$occupancy_slots' },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%H:00',
                  date: '$occupancy_slots',
                  timezone: 'Africa/Cairo',
                },
              },
              units: { $sum: '$quantity' },
            },
          },
          { $sort: { units: -1 } },
        ],
        nationality: [
          {
            $group: {
              _id: null,
              local: { $sum: '$local_guests' },
              foreign: { $sum: '$foreigner_guests' },
            },
          },
        ],
        cancellations: [
          {
            $group: {
              _id: {
                $cond: [
                  { $in: ['$status', ['CANCELLED', 'FAILED', 'REFUNDED', 'NO_SHOW']] },
                  'cancelled',
                  'active',
                ],
              },
              count: { $sum: 1 },
            },
          },
        ],
        sources: [{ $group: { _id: { $ifNull: ['$source', 'online'] }, count: { $sum: 1 } } }],
      },
    },
  ]);

  const tripIds = (facet.popular_activities as { _id: Types.ObjectId }[])
    .map((r) => r._id)
    .filter(Boolean);
  const trips = tripIds.length
    ? await Trip.find({ _id: { $in: tripIds } }).select('name')
    : [];
  const tripName = new Map(trips.map((t) => [t.id, t.name]));

  return {
    from,
    to,
    by_day: facet.by_day,
    popular_activities: (facet.popular_activities as { _id: Types.ObjectId; bookings: number; units: number }[]).map(
      (row) => ({
        trip_id: row._id?.toString(),
        name: tripName.get(row._id?.toString() ?? '') ?? null,
        bookings: row.bookings,
        units: row.units,
      }),
    ),
    peak_hours: facet.peak_hours,
    nationality: facet.nationality[0] ?? { local: 0, foreign: 0 },
    cancellations: facet.cancellations,
    sources: facet.sources,
  };
}

export async function getCustomers(
  supplierId: string | null,
  q: string,
  page: number,
  limit: number,
) {
  const match: Record<string, unknown> = { ...scopeFilter(supplierId) };
  if (q.trim()) {
    match.$or = [
      { phone_number: { $regex: q.trim(), $options: 'i' } },
      { full_name: { $regex: q.trim(), $options: 'i' } },
    ];
  }
  const skip = (page - 1) * limit;
  const [facet] = await Booking.aggregate([
    { $match: match },
    {
      $facet: {
        items: [
          { $sort: { booking_date: -1 } },
          {
            $group: {
              _id: '$phone_number',
              name: { $first: '$full_name' },
              bookings: { $sum: 1 },
              last_visit: { $max: '$booking_date' },
              total: { $sum: '$amount' },
            },
          },
          { $sort: { last_visit: -1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        total: [
          { $group: { _id: '$phone_number' } },
          { $count: 'count' },
        ],
      },
    },
  ]);
  return {
    items: (facet.items as { _id: string; name: string; bookings: number; last_visit: Date; total: number }[]).map(
      (row) => ({
        phone_number: row._id,
        name: row.name,
        bookings: row.bookings,
        last_visit: row.last_visit,
        total: row.total,
      }),
    ),
    total: facet.total[0]?.count ?? 0,
    page,
    limit,
  };
}

export interface OpsNotificationItem {
  key: string;
  type: 'pending_confirmation' | 'new_booking' | 'slot_almost_full' | 'equipment_maintenance';
  title: string;
  href: string;
  read: boolean;
}

export async function listOpsNotifications(
  supplierId: string | null,
  userId: string,
  today = toSiteYmd(new Date()),
  basePath = '/admin',
): Promise<OpsNotificationItem[]> {
  const state = await OpsNotificationState.findOne({ user_id: oid(userId) });
  const lastSeen = state?.last_seen_at ?? new Date(0);
  const dismissed = new Set(state?.dismissed_keys ?? []);
  const items: OpsNotificationItem[] = [];

  const pending = await Booking.countDocuments({
    ...scopeFilter(supplierId),
    status: 'PENDING',
  });
  if (pending > 0) {
    items.push({
      key: 'pending_confirmation',
      type: 'pending_confirmation',
      title: `${pending} حجوزات بانتظار التأكيد`,
      href: `${basePath}/bookings?group=needsAction`,
      read: dismissed.has('pending_confirmation'),
    });
  }

  const newBookings = await Booking.find({
    ...scopeFilter(supplierId),
    created_at: { $gt: lastSeen },
  })
    .select('created_at booking_date')
    .sort({ created_at: -1 })
    .limit(20);
  for (const b of newBookings) {
    const key = `new_booking:${b.id}`;
    const ymd = toSiteYmd(b.booking_date);
    const time = slotHHMM(b.booking_date);
    items.push({
      key,
      type: 'new_booking',
      title: 'حجز جديد',
      href: `${basePath}/calendar/${ymd}/${time}`,
      read: dismissed.has(key),
    });
  }

  const tomorrow = addSiteDays(today, 1);
  for (const day of [today, tomorrow]) {
    const dayData = await getOpsDay(supplierId, day);
    for (const hour of dayData.hours) {
      if (hour.pct >= 90) {
        const key = `slot_almost_full:${day}:${hour.hour}`;
        items.push({
          key,
          type: 'slot_almost_full',
          title: `الساعة ${hour.hour} يوم ${day} شبه ممتلئة (${hour.pct}٪)`,
          href: `${basePath}/calendar/${day}/${hour.hour}`,
          read: dismissed.has(key),
        });
      }
    }
  }

  const capacity = await loadCapacity(supplierId);
  for (const row of capacity.per_resource) {
    if (row.maintenance > 0) {
      const key = `equipment_maintenance:${row.type}`;
      items.push({
        key,
        type: 'equipment_maintenance',
        title: `${row.maintenance} من ${row.type} في الصيانة`,
        href: `${basePath}/more`,
        read: dismissed.has(key),
      });
    }
  }

  return items;
}

export async function markNotificationsRead(userId: string, keys?: string[]) {
  const state =
    (await OpsNotificationState.findOne({ user_id: oid(userId) })) ??
    new OpsNotificationState({ user_id: oid(userId), dismissed_keys: [], last_seen_at: new Date(0) });
  state.last_seen_at = new Date();
  if (keys?.length) {
    const set = new Set(state.dismissed_keys);
    for (const key of keys) set.add(key);
    state.dismissed_keys = [...set];
  }
  await state.save();
  return state;
}
