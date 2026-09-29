import { describe, expect, it } from 'vitest';
import {
  matchesTripListingFilter,
  parseTripListingFilter,
  resolveTripActivities,
  tripListingHref,
} from '@/lib/trips/listing-filter';
import { tripLocationLabel } from '@/lib/trips/location';

describe('trip listing filter', () => {
  it('parses known values and drops unknown ones', () => {
    expect(parseTripListingFilter({ type: 'tour', activity: 'kayak' })).toEqual({
      type: 'tour',
      activity: 'kayak',
    });
    expect(parseTripListingFilter({ type: 'cruise', activity: ['sup', 'kayak'] })).toEqual({
      type: undefined,
      activity: 'sup',
    });
    expect(parseTripListingFilter({})).toEqual({ type: undefined, activity: undefined });
  });

  it('builds hrefs that round-trip through the parser', () => {
    expect(tripListingHref()).toBe('/trips');
    expect(tripListingHref({ type: 'trip' })).toBe('/trips?type=trip');
    const href = tripListingHref({ activity: 'waterbike' });
    expect(href).toBe('/trips?activity=waterbike');
    const params = Object.fromEntries(new URL(href, 'https://x').searchParams);
    expect(parseTripListingFilter(params)).toEqual({ type: undefined, activity: 'waterbike' });
  });

  it("prefers the trip's own activities over its destinations'", () => {
    const destinations = [{ activities: ['kayak', 'sup'] }];
    expect(resolveTripActivities({ activities: ['waterbike'], destinations })).toEqual([
      'waterbike',
    ]);
    expect(resolveTripActivities({ activities: [], destinations })).toEqual(['kayak', 'sup']);
    expect(resolveTripActivities({})).toEqual([]);
  });

  it('filters by kind and activity', () => {
    const tour = { is_tour: true, activities: ['kayak'] };
    const trip = { is_tour: false, destinations: [{ activities: ['sup'] }] };
    expect(matchesTripListingFilter(tour, {})).toBe(true);
    expect(matchesTripListingFilter(tour, { type: 'tour' })).toBe(true);
    expect(matchesTripListingFilter(trip, { type: 'tour' })).toBe(false);
    expect(matchesTripListingFilter(trip, { type: 'trip' })).toBe(true);
    expect(matchesTripListingFilter(trip, { activity: 'sup' })).toBe(true);
    expect(matchesTripListingFilter(tour, { activity: 'sup' })).toBe(false);
    expect(matchesTripListingFilter(tour, { type: 'tour', activity: 'kayak' })).toBe(true);
  });
});

describe('tripLocationLabel', () => {
  it('joins unique destination names', () => {
    expect(tripLocationLabel(['Elephantine', ' Elephantine ', 'Philae'], 'Dock', ', ')).toBe(
      'Elephantine, Philae',
    );
  });

  it('falls back to the first line of the meeting point', () => {
    expect(tripLocationLabel([], 'Old Cataract dock\nAsk for the captain')).toBe(
      'Old Cataract dock',
    );
    expect(tripLocationLabel([undefined, ''], '')).toBe('');
  });
});
