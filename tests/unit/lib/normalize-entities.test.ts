import { describe, expect, it } from 'vitest';
import {
  normalizeTrip,
  normalizeTrips,
  sortTripsByDisplayOrder,
} from '@/lib/api/normalize-entities';

describe('normalize-entities', () => {
  it('maps Go ID to id', () => {
    const trip = normalizeTrip({ ID: 'trip-1', price: 100 });
    expect(trip.id).toBe('trip-1');
  });

  it('sorts by display_order then id', () => {
    const sorted = sortTripsByDisplayOrder([
      { id: 'b', display_order: 1 } as never,
      { id: 'a', display_order: 1 } as never,
      { id: 'c', display_order: 0 } as never,
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['c', 'a', 'b']);
  });

  it('normalizes trip arrays', () => {
    expect(normalizeTrips([{ id: 't1', display_order: 2 }])).toHaveLength(1);
    expect(normalizeTrips(null)).toEqual([]);
  });
});
