import { describe, expect, it } from 'vitest';
import {
  normalizeImageUrls,
  applyTripUpdate,
  toTripResponse,
} from '@/server/services/trip';

describe('trip service', () => {
  it('normalizeImageUrls accepts array', () => {
    expect(normalizeImageUrls(['/a.jpg', '/b.jpg'])).toEqual(['/a.jpg', '/b.jpg']);
  });

  it('normalizeImageUrls accepts legacy object', () => {
    expect(normalizeImageUrls({ img1: '/a.jpg', img2: '/b.jpg' })).toEqual([
      '/a.jpg',
      '/b.jpg',
    ]);
  });

  it('applyTripUpdate mutates provided fields', () => {
    const trip = {
      price: 100,
      is_tour: false,
      images: [],
    } as unknown as Parameters<typeof applyTripUpdate>[0];

    applyTripUpdate(trip, { price: 200, images: ['/new.jpg'] });
    expect(trip.price).toBe(200);
    expect(trip.images).toEqual(['/new.jpg']);
  });

  it('toTripResponse resolves localized fields', () => {
    const json = {
      id: '1',
      name: { en: 'Trip', ar: 'رحلة' },
      description: { en: 'Desc', ar: 'وصف' },
    };
    const result = toTripResponse(json, 'en');
    expect(result.name).toBe('Trip');
    expect(result.description).toBe('Desc');
  });
});
