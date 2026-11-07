import type { InvoiceLine } from '@/lib/finance/erp-types';
import { toSiteYmd } from '@/lib/time';
import { round2 } from '../services/util';
import { discountLedgerLabel } from '@/lib/booking/discount';

/**
 * Pure mapping from a Duck booking to what the ERP should hold for it. No
 * database access, so the backfill dry run and the tests can use it as is.
 * See docs/finance/booking-sync.md for the rules.
 */

/** The Duck booking fields the sync reads. */
export interface DuckBookingLike {
  _id: unknown;
  supplier_id: unknown;
  trip_id: unknown;
  status: string;
  amount: number;
  subtotal?: number | null;
  discount?: { code?: string; amount?: number; source?: string; reason?: string } | null;
  currency?: string;
  full_name: string;
  phone_number: string;
  payment_method?: string;
  order_id?: string;
  booking_date: Date;
  quantity?: number;
  local_guests?: number;
  foreigner_guests?: number;
  wants_guide?: boolean;
  duration?: number;
  pricing_snapshot?: { price?: number; foreigner_price?: number; guide_price?: number } | null;
  amount_paid?: number;
  refund_owed?: number;
  payment_entries?: { amount: number; recorded_at: Date | string; note?: string }[];
  resource_type?: string;
  source?: string;
  cancelled_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

/** The Duck trip fields the sync reads. */
export interface DuckTripLike {
  _id: unknown;
  name?: { en?: string; ar?: string };
  activities?: string[];
  guide_mandatory?: boolean;
  is_tour?: boolean;
}

/** A booking that has reached one of these was sold: it gets an invoice. */
export const SOLD_STATUSES = ['CONFIRMED', 'PAID', 'SUCCESS', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'] as const;
/** Sold, then undone: revenue goes back to zero (money held is owed or refunded). */
export const VOID_STATUSES = ['CANCELLED', 'REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED'] as const;
/** Never sold on their own. */
export const UNSOLD_STATUSES = ['PENDING', 'FAILED'] as const;

const has = (list: readonly string[], status: string) => list.includes(status);

/** Revenue accounts the accountant approved per activity. */
export const REVENUE_ACCOUNTS = {
  kayak: '4110',
  sup: '4120',
  waterBike: '4130',
  privateBoat: '4140',
  groupExtras: '4150',
} as const;

export interface ActivityMapping {
  account: string;
  label: string;
}

const ACTIVITY_BY_KEY: Record<string, ActivityMapping> = {
  kayak: { account: REVENUE_ACCOUNTS.kayak, label: 'Kayak' },
  sup: { account: REVENUE_ACCOUNTS.sup, label: 'SUP' },
  waterbike: { account: REVENUE_ACCOUNTS.waterBike, label: 'Water Bike' },
  water_cycle: { account: REVENUE_ACCOUNTS.waterBike, label: 'Water Bike' },
};
const PRIVATE_BOAT: ActivityMapping = { account: REVENUE_ACCOUNTS.privateBoat, label: 'Private Boat / Felucca' };
const GROUP_EXTRAS: ActivityMapping = { account: REVENUE_ACCOUNTS.groupExtras, label: 'Group / Extras' };
const BOAT_NAME = /felucca|boat|فلوكة|فلوك|مركب|قارب/i;

/** The trip's activity: its single listed activity, else a boat/felucca name, else group/extras. */
export function tripActivity(trip: DuckTripLike | null): ActivityMapping {
  const acts = [...new Set(trip?.activities ?? [])];
  if (acts.length === 1 && ACTIVITY_BY_KEY[acts[0]]) return ACTIVITY_BY_KEY[acts[0]];
  const name = `${trip?.name?.en ?? ''} ${trip?.name?.ar ?? ''}`;
  if (BOAT_NAME.test(name)) return PRIVATE_BOAT;
  return GROUP_EXTRAS;
}

/** A booking's activity: the resource it rented when set, else its trip's. */
export function bookingActivity(booking: Pick<DuckBookingLike, 'resource_type'>, trip: DuckTripLike | null): ActivityMapping {
  const byResource = booking.resource_type ? ACTIVITY_BY_KEY[booking.resource_type] : undefined;
  return byResource ?? tripActivity(trip);
}

export const tripName = (trip: DuckTripLike | null) => trip?.name?.en?.trim() || trip?.name?.ar?.trim() || 'Duck trip';

/** List price before discount; bookings from before discount codes have none and read as `amount`. */
export function subtotalOf(b: Pick<DuckBookingLike, 'amount' | 'subtotal'>): number {
  return b.subtotal != null && b.subtotal > 0 ? b.subtotal : b.amount;
}

/** Money Duck still holds for the booking: amount paid, less refunds already sent. */
export const cashHeld = (b: Pick<DuckBookingLike, 'amount_paid'>) => round2(Math.max(0, b.amount_paid ?? 0));

/** Money kept as earned: paid, less what an edit made owed back. */
export const retained = (b: Pick<DuckBookingLike, 'amount_paid' | 'refund_owed'>) =>
  round2(Math.max(0, (b.amount_paid ?? 0) - (b.refund_owed ?? 0)));

const isEditOwedNote = (note?: string) => (note ?? '').startsWith('edit refund owed');

export function hasPayments(b: Pick<DuckBookingLike, 'amount_paid' | 'payment_entries'>): boolean {
  return (b.amount_paid ?? 0) > 0 || (b.payment_entries ?? []).some((e) => e.amount !== 0);
}

/** Whether the booking was ever sold. Void and NO_SHOW states imply it was. */
export function everSold(b: Pick<DuckBookingLike, 'status' | 'amount_paid' | 'payment_entries'>): boolean {
  if (has(SOLD_STATUSES, b.status) || b.status === 'NO_SHOW') return true;
  if (b.status === 'CANCELLED') return hasPayments(b);
  if (has(VOID_STATUSES, b.status)) return true;
  return false;
}

/**
 * Net revenue the ERP should hold: the booking total while sold, the money
 * kept on a no-show (the unpaid part is waived), zero once void.
 */
export function revenueTarget(b: DuckBookingLike): number {
  if (has(SOLD_STATUSES, b.status)) return round2(b.amount);
  if (b.status === 'NO_SHOW') return round2(Math.min(b.amount, retained(b)));
  return 0;
}

export interface CashEntry {
  key: string;
  amount: number;
  date: string;
  note: string;
}

/**
 * Payment entries that are money received. Entries an edit writes for a
 * refund owed (or its reduction) are bookkeeping, not cash, and negative
 * entries are refunds; both are left out.
 */
export function cashInEntries(b: Pick<DuckBookingLike, 'payment_entries'>): CashEntry[] {
  const seen = new Map<string, number>();
  const out: CashEntry[] = [];
  for (const e of b.payment_entries ?? []) {
    if (!(e.amount > 0) || isEditOwedNote(e.note)) continue;
    const at = new Date(e.recorded_at);
    const base = `pe:${at.getTime()}:${round2(e.amount)}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.push({ key: `${base}:${n}`, amount: round2(e.amount), date: toSiteYmd(at), note: e.note ?? '' });
  }
  return out;
}

/** Date the latest change happened (Cairo), for adjustment documents. */
export function changeDate(b: Pick<DuckBookingLike, 'updated_at' | 'cancelled_at' | 'payment_entries'>, now = new Date()): string {
  const times = [b.updated_at, b.cancelled_at, ...(b.payment_entries ?? []).map((e) => e.recorded_at)]
    .filter(Boolean)
    .map((d) => new Date(d as Date).getTime());
  return toSiteYmd(times.length ? new Date(Math.max(...times)) : now);
}

export const activityDate = (b: Pick<DuckBookingLike, 'booking_date'>) => toSiteYmd(new Date(b.booking_date));

export interface InvoiceSpec {
  date: string;
  lines: InvoiceLine[];
  /** Sum of line net amounts: equals the revenue target. */
  total: number;
  signature: string;
}

type DraftLine = Pick<InvoiceLine, 'service' | 'pax' | 'unitPrice' | 'revenueAccountCode' | 'activity'> & { notes: string[] };

/**
 * The invoice for a booking at `target` net revenue. Lines follow Duck's
 * pricing (`computeBookingAmount`): local guests × local price and foreign
 * guests × foreign price, each × the hours on a tour, plus the guide. Kids
 * pay the guest price (Duck has no kids price). A difference between those
 * lines and the booking's list price (an admin price override, a locked or
 * legacy price) becomes a "price adjustment" line or discount, so the gross
 * always equals the booking subtotal; the discount code, any adjustment and
 * a no-show waiver net against revenue, so the total equals `target`.
 */
export function invoiceSpec(b: DuckBookingLike, trip: DuckTripLike | null, target: number): InvoiceSpec {
  const snap = b.pricing_snapshot ?? {};
  const activity = bookingActivity(b, trip);
  const hours = (b.duration ?? 0) > 0 ? Number(b.duration) : 1;
  const per = (b.duration ?? 0) > 0 ? ` × ${hours}h` : '';
  const local = Math.max(0, Math.trunc(b.local_guests ?? 0));
  const foreign = Math.max(0, Math.trunc(b.foreigner_guests ?? 0));

  const drafts: DraftLine[] = [];
  const guestLine = (label: string, pax: number, price: number) => {
    if (pax <= 0) return;
    drafts.push({
      service: `${activity.label} - ${label}${per}`,
      pax,
      unitPrice: round2((price ?? 0) * hours),
      revenueAccountCode: activity.account,
      activity: activity.label,
      notes: [],
    });
  };
  if (local === 0 && foreign === 0) {
    guestLine('Guest', Math.max(1, Math.trunc(b.quantity ?? 1)), snap.price ?? 0);
  } else {
    guestLine('Egyptian Guest', local, snap.price ?? 0);
    guestLine('Foreign Guest', foreign, snap.foreigner_price ?? 0);
  }
  if ((b.wants_guide || trip?.guide_mandatory) && (snap.guide_price ?? 0) > 0) {
    drafts.push({
      service: 'Tour guide',
      pax: 1,
      unitPrice: round2(snap.guide_price ?? 0),
      revenueAccountCode: REVENUE_ACCOUNTS.groupExtras,
      activity: GROUP_EXTRAS.label,
      notes: [],
    });
  }

  const linesGross = round2(drafts.reduce((s, l) => s + round2(l.pax * l.unitPrice), 0));
  const gross = round2(Math.max(subtotalOf(b), b.amount));
  if (gross > linesGross + 0.005) {
    drafts.push({
      service: 'Price adjustment',
      pax: 1,
      unitPrice: round2(gross - linesGross),
      revenueAccountCode: activity.account,
      activity: activity.label,
      notes: ['Booking price differs from the trip price list'],
    });
  }

  // Net reductions, in the order they are applied to the lines.
  const reductions: { label: string; amount: number }[] = [];
  const priceCut = round2(linesGross - gross);
  if (priceCut > 0.005) reductions.push({ label: 'Price adjustment', amount: priceCut });
  const codeDiscount = round2(gross - b.amount);
  if (codeDiscount > 0.005) {
    reductions.push({ label: discountLedgerLabel(b.discount) || 'Discount', amount: codeDiscount });
  }
  const waived = round2(b.amount - target);
  if (waived > 0.005) reductions.push({ label: target > 0 ? 'No-show: unpaid balance waived' : 'Waived', amount: waived });

  const lines = drafts.map((d, idx): InvoiceLine & { _notes: string[] } => {
    const grossAmount = round2(d.pax * d.unitPrice);
    return {
      id: `dl-${idx}`,
      tourType: tripName(trip),
      service: d.service,
      pax: d.pax,
      unitPrice: d.unitPrice,
      grossAmount,
      discount: 0,
      netAmount: grossAmount,
      captain: '',
      revenueAccountCode: d.revenueAccountCode,
      costCenter: '',
      activity: d.activity,
      location: '',
      _notes: [...d.notes],
    };
  });

  // Each reduction is taken from the lines in order, never below zero.
  for (const r of reductions) {
    let left = r.amount;
    for (const l of lines) {
      if (left <= 0.005) break;
      const take = round2(Math.min(left, l.netAmount));
      if (take <= 0) continue;
      l.discount = round2(l.discount + take);
      l.netAmount = round2(l.netAmount - take);
      l._notes.push(`${r.label}: ${take.toFixed(2)}`);
      left = round2(left - take);
    }
  }

  const out: InvoiceLine[] = lines.map(({ _notes, ...l }) => ({ ...l, notes: _notes.length ? _notes.join('; ') : undefined }));
  const total = round2(out.reduce((s, l) => s + l.netAmount, 0));
  const date = activityDate(b);
  const signature = JSON.stringify({
    date,
    lines: out.map((l) => [l.service, l.pax, l.unitPrice, l.discount, l.revenueAccountCode]),
  });
  return { date, lines: out, total, signature };
}

/** ERP booking status for a Duck booking. */
export function erpBookingStatus(b: Pick<DuckBookingLike, 'status'>, invoiced: boolean): 'Confirmed' | 'Completed' | 'Cancelled' | 'Invoiced' {
  if (has(VOID_STATUSES, b.status) || has(UNSOLD_STATUSES, b.status)) return 'Cancelled';
  return invoiced ? 'Invoiced' : b.status === 'COMPLETED' ? 'Completed' : 'Confirmed';
}

export function nationalityCategory(b: Pick<DuckBookingLike, 'local_guests' | 'foreigner_guests'>): 'Egyptian' | 'Foreigner' | 'Mixed Group' {
  const local = b.local_guests ?? 0;
  const foreign = b.foreigner_guests ?? 0;
  if (local > 0 && foreign > 0) return 'Mixed Group';
  return foreign > 0 ? 'Foreigner' : 'Egyptian';
}

/** What the backfill dry run reports for one booking, without touching the ERP. */
export interface BookingPlan {
  month: string;
  sold: boolean;
  revenue: number;
  cashIn: number;
  cashHeld: number;
  unsupported?: string;
}

export function planBooking(b: DuckBookingLike, trip: DuckTripLike | null): BookingPlan {
  const month = activityDate(b).slice(0, 7);
  if ((b.currency ?? 'EGP') !== 'EGP') {
    return { month, sold: false, revenue: 0, cashIn: 0, cashHeld: 0, unsupported: `currency ${b.currency}` };
  }
  if (!everSold(b)) return { month, sold: false, revenue: 0, cashIn: 0, cashHeld: 0 };
  const entriesIn = round2(cashInEntries(b).reduce((s, e) => s + e.amount, 0));
  const held = cashHeld(b);
  const target = revenueTarget(b);
  return {
    month,
    sold: true,
    revenue: target > 0 ? invoiceSpec(b, trip, target).total : 0,
    cashIn: round2(Math.max(entriesIn, held)),
    cashHeld: held,
  };
}
