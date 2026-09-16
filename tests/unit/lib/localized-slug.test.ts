import { describe, expect, it } from 'vitest';
import {
  toDestinationResponse,
  toTripResponse,
} from '@/server/services/trip';
import {
  canonicalDestinationPath,
  canonicalTripPath,
} from '@/lib/seo/slug';

describe('localized canonical slugs', () => {
  it('keeps the English trip slug after localizing the response to Arabic', () => {
    const raw = {
      id: '507f1f77bcf86cd799439011',
      name: { en: 'Kayak Free Tour', ar: 'جولة كاياك مجانية' },
      description: { en: 'Description', ar: 'وصف' },
    };
    const ar = toTripResponse(raw, 'ar') as {
      id: string;
      name: string;
      slug: string;
    };

    expect(ar.name).toBe('جولة كاياك مجانية');
    expect(ar.slug).toBe('kayak-free-tour');
    expect(canonicalTripPath(ar)).toBe('/trips/kayak-free-tour');
  });

  it('keeps the English destination slug after localizing to Arabic', () => {
    const raw = {
      id: '507f1f77bcf86cd799439012',
      name: { en: 'Nubian Village', ar: 'القرية النوبية' },
      description: { en: 'Description', ar: 'وصف' },
    };
    const ar = toDestinationResponse(raw, 'ar') as {
      id: string;
      name: string;
      slug: string;
    };

    expect(ar.slug).toBe('nubian-village');
    expect(canonicalDestinationPath(ar)).toBe('/destinations/nubian-village');
  });
});
