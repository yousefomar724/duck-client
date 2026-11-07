import { describe, expect, it } from 'vitest';
import { computeBookingAmount } from '@/server/services/booking';
import {
  cashInEntries,
  everSold,
  invoiceSpec,
  planBooking,
  revenueTarget,
  tripActivity,
  type DuckBookingLike,
  type DuckTripLike,
} from '@/server/finance/sync/mapping';

const trip = (over: Partial<DuckTripLike> = {}): DuckTripLike => ({ _id: 't1', name: { en: 'Nile Kayak' }, activities: ['kayak'], ...over });

function booking(over: Partial<DuckBookingLike> = {}): DuckBookingLike {
  return {
    _id: 'b1',
    supplier_id: 's1',
    trip_id: 't1',
    status: 'CONFIRMED',
    amount: 360,
    subtotal: 360,
    full_name: 'Guest',
    phone_number: '+201000000000',
    booking_date: new Date('2026-11-20T10:00:00Z'),
    quantity: 2,
    local_guests: 2,
    foreigner_guests: 0,
    duration: 0,
    pricing_snapshot: { price: 180, foreigner_price: 500, guide_price: 150 },
    ...over,
  };
}

/** Builds a booking the way Duck prices it, so the test compares against the real engine. */
function priced(
  t: { is_tour: boolean; guide_mandatory?: boolean },
  req: { local: number; foreign: number; duration?: number; guide?: boolean; quantity?: number },
  over: Partial<DuckBookingLike> = {},
) {
  const snap = { price: 180, foreigner_price: 500, guide_price: 150 };
  const { amount } = computeBookingAmount(
    { is_tour: t.is_tour, ...snap, guide_mandatory: Boolean(t.guide_mandatory) },
    { local_guests: req.local, foreigner_guests: req.foreign, duration: req.duration, wants_guide: req.guide, quantity: req.quantity },
  );
  return booking({
    amount,
    subtotal: amount,
    local_guests: req.local,
    foreigner_guests: req.foreign,
    quantity: req.quantity ?? req.local + req.foreign,
    duration: t.is_tour ? (req.duration ?? 1) : 0,
    wants_guide: Boolean(req.guide),
    pricing_snapshot: snap,
    ...over,
  });
}

describe('finance sync mapping', () => {
  it.each([
    ['locals only', { is_tour: false }, { local: 3, foreign: 0 }],
    ['mixed group', { is_tour: false }, { local: 2, foreign: 3 }],
    ['kids count as guests', { is_tour: false }, { local: 4, foreign: 0 }],
    ['tour priced per hour', { is_tour: true }, { local: 2, foreign: 1, duration: 3 }],
    ['guide on request', { is_tour: false }, { local: 2, foreign: 0, guide: true }],
    ['mandatory guide', { is_tour: true, guide_mandatory: true }, { local: 1, foreign: 1, duration: 2 }],
  ] as [string, { is_tour: boolean; guide_mandatory?: boolean }, { local: number; foreign: number; duration?: number; guide?: boolean }][])(
    'invoice lines add up to the booking subtotal: %s',
    (_label, t, req) => {
    // Kids ride on the guest price: Duck stores them, its pricing ignores them.
    const kids = (req.local === 4 ? { adults: 2, kids_1_6: 1, kids_7_12: 1 } : {}) as Partial<DuckBookingLike>;
    const b = priced(t, req, kids);
    const spec = invoiceSpec(b, trip({ guide_mandatory: t.guide_mandatory }), revenueTarget(b));
    const gross = spec.lines.reduce((s, l) => s + l.grossAmount, 0);
    expect(gross).toBeCloseTo(b.subtotal!, 2);
    expect(spec.total).toBeCloseTo(b.amount, 2);
    expect(spec.lines.some((l) => l.service === 'Price adjustment')).toBe(false);
    },
  );

  it('nets the discount against revenue lines and keeps the gross at the subtotal', () => {
    const b = booking({ subtotal: 400, amount: 300, pricing_snapshot: { price: 200, foreigner_price: 0, guide_price: 0 }, discount: { code: 'BIG', amount: 100 } });
    const spec = invoiceSpec(b, trip(), revenueTarget(b));
    expect(spec.lines).toHaveLength(1);
    expect(spec.lines[0]).toMatchObject({ grossAmount: 400, discount: 100, netAmount: 300, revenueAccountCode: '4110' });
    expect(spec.total).toBe(300);
  });

  it('adds a price adjustment line when the booking price differs from its lines (admin override)', () => {
    const b = booking({ subtotal: 360, amount: 500 });
    const spec = invoiceSpec(b, trip(), revenueTarget(b));
    expect(spec.lines.map((l) => [l.service, l.grossAmount])).toEqual([
      ['Kayak - Egyptian Guest', 360],
      ['Price adjustment', 140],
    ]);
    expect(spec.total).toBe(500);
  });

  it('waives the unpaid part of a no-show', () => {
    const b = booking({ status: 'NO_SHOW', amount_paid: 100 });
    expect(revenueTarget(b)).toBe(100);
    const spec = invoiceSpec(b, trip(), revenueTarget(b));
    expect(spec.total).toBe(100);
    expect(spec.lines[0].notes).toContain('No-show');
  });

  it('maps activities to the approved revenue accounts', () => {
    expect(tripActivity(trip({ activities: ['sup'] })).account).toBe('4120');
    expect(tripActivity(trip({ activities: ['waterbike'] })).account).toBe('4130');
    expect(tripActivity(trip({ activities: [], name: { en: 'Sunset Felucca' } })).account).toBe('4140');
    expect(tripActivity(trip({ activities: ['kayak', 'sup'], name: { en: 'Combo' } })).account).toBe('4150');
    const b = booking({ resource_type: 'water_cycle' });
    expect(invoiceSpec(b, trip(), 360).lines[0].revenueAccountCode).toBe('4130');
  });

  it('knows which bookings were sold', () => {
    expect(everSold(booking({ status: 'PENDING' }))).toBe(false);
    expect(everSold(booking({ status: 'FAILED' }))).toBe(false);
    expect(everSold(booking({ status: 'CANCELLED' }))).toBe(false);
    expect(everSold(booking({ status: 'CANCELLED', amount_paid: 50 }))).toBe(true);
    for (const s of ['CONFIRMED', 'PAID', 'SUCCESS', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'REFUNDED']) {
      expect(everSold(booking({ status: s }))).toBe(true);
    }
    expect(revenueTarget(booking({ status: 'REFUND_PENDING' }))).toBe(0);
  });

  it('treats only received money as cash entries, with stable keys', () => {
    const at = new Date('2026-11-05T09:00:00Z');
    const entries = cashInEntries({
      payment_entries: [
        { amount: 200, recorded_at: at, note: '' },
        { amount: -50, recorded_at: at, note: 'edit refund owed' },
        { amount: 30, recorded_at: at, note: 'edit refund owed reduced' },
        { amount: 0, recorded_at: at, note: 'refund sent to customer' },
        { amount: 200, recorded_at: at, note: '' },
      ],
    });
    expect(entries.map((e) => e.key)).toEqual([`pe:${at.getTime()}:200:1`, `pe:${at.getTime()}:200:2`]);
    expect(entries[0].date).toBe('2026-11-05');
  });

  it('plans a dry run without touching the ERP', () => {
    expect(planBooking(booking({ status: 'PENDING' }), trip())).toMatchObject({ sold: false });
    expect(planBooking(booking({ currency: 'USD' }), trip()).unsupported).toMatch(/USD/);
    expect(planBooking(booking({ amount_paid: 360 }), trip())).toMatchObject({ month: '2026-11', sold: true, revenue: 360, cashIn: 360 });
  });
});
