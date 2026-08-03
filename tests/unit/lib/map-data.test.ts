import { describe, expect, it } from 'vitest';
import {
  destinationToMapLocation,
  destinationsToMapLocations,
} from '@/components/map/map-data';

describe('map-data', () => {
  it('transforms destination to map location', () => {
    const location = destinationToMapLocation(
      {
        id: 'd1',
        name: { en: 'Aswan', ar: 'أسوان' },
        description: { en: 'Desc', ar: 'وصف' },
        lat: 24.1,
        lng: 32.9,
        activities: ['kayak'],
        image: '/img.jpg',
        public_status: 'open',
      } as never,
      { locale: 'en' },
    );
    expect(location.name).toBe('Aswan');
    expect(location.coordinates).toEqual([24.1, 32.9]);
  });

  it('skips destinations without coordinates', () => {
    const locations = destinationsToMapLocations([
      { id: 'd1', lat: null, lng: null } as never,
      { id: 'd2', lat: 24, lng: 32, name: 'X' } as never,
    ]);
    expect(locations).toHaveLength(1);
  });
});
