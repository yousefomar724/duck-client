import { describe, expect, it } from 'vitest';
import {
  buildDestinationJsonLd,
  buildDestinationTripsJsonLd,
} from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/site';
import type {
  PublicDestination,
  PublicTrip,
} from '@/server/services/public-content';

const destination: PublicDestination = {
  id: 'd1',
  slug: 'nile-island',
  name: 'Nile Island',
  description: 'A meeting point on the Nile.',
  image: '/island.jpg',
  images: ['/island.jpg'],
  lat: 24.0889,
  lng: 32.8998,
  activities: ['kayak', 'sup'],
  public_status: 'open',
  operating_hours: 'Daily 7am - sunset',
};

const trip = {
  id: 't1',
  slug: 'sunset-kayak',
  name: 'Sunset Kayak',
  price: 180,
  foreigner_price: 500,
  currency: 'EGP',
  duration: 2,
  max_guests: 6,
  images: [],
  from: '2026-01-01T00:00:00.000Z',
} as unknown as PublicTrip;

describe('buildDestinationJsonLd', () => {
  it('publishes coordinates, address and a map link', () => {
    const json = buildDestinationJsonLd(destination);
    expect(json.geo).toMatchObject({ latitude: 24.0889, longitude: 32.8998 });
    expect(json.address).toMatchObject({ addressLocality: 'Aswan' });
    expect(json.hasMap).toContain('24.0889');
    expect(json.openingHours).toBe('Daily 7am - sunset');
    expect(json.publicAccess).toBe(true);
  });

  it('lists the bookable activities as features', () => {
    expect(buildDestinationJsonLd(destination).amenityFeature).toEqual([
      { '@type': 'LocationFeatureSpecification', name: 'kayak', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'sup', value: true },
    ]);
  });

  it('falls back to the business map link without coordinates', () => {
    const json = buildDestinationJsonLd({
      ...destination,
      lat: undefined,
      lng: undefined,
    });
    expect(json.geo).toBeUndefined();
    expect(json.hasMap).toBe('https://maps.app.goo.gl/FPt8JJ8VgaTTzBir6');
  });

  it('marks a coming-soon destination as not publicly accessible', () => {
    expect(
      buildDestinationJsonLd({ ...destination, public_status: 'coming-soon' })
        .publicAccess,
    ).toBe(false);
  });
});

describe('buildDestinationTripsJsonLd', () => {
  it('references the trip nodes emitted into the same graph', () => {
    const list = buildDestinationTripsJsonLd(destination, [trip], 'Trips here');
    expect(list.numberOfItems).toBe(1);
    expect(list.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        item: { '@id': `${SITE_URL}/trips/sunset-kayak#trip` },
      },
    ]);
  });
});
