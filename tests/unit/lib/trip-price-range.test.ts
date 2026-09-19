import { describe, expect, it } from 'vitest';
import { tripPriceRange } from '@/lib/trips/price-range';

describe('tripPriceRange', () => {
  it('returns null when there is nothing priced', () => {
    expect(tripPriceRange([])).toBeNull();
    expect(tripPriceRange([{ price: 0, foreigner_price: 0 }])).toBeNull();
  });

  it('minimises each tier independently', () => {
    expect(
      tripPriceRange([
        { price: 300, foreigner_price: 500, currency: 'EGP' },
        { price: 180, foreigner_price: 900, currency: 'EGP' },
      ]),
    ).toEqual({ localFrom: 180, foreignerFrom: 500, currency: 'EGP' });
  });

  it('reports no foreigner tier when no trip has one', () => {
    expect(
      tripPriceRange([
        { price: 180, foreigner_price: 0, currency: 'EGP' },
        { price: 250, currency: 'EGP' },
      ]),
    ).toEqual({ localFrom: 180, foreignerFrom: null, currency: 'EGP' });
  });

  it('ignores the foreigner tier of trips that do not set one', () => {
    expect(
      tripPriceRange([
        { price: 180, foreigner_price: 0, currency: 'EGP' },
        { price: 300, foreigner_price: 500, currency: 'EGP' },
      ]),
    ).toEqual({ localFrom: 180, foreignerFrom: 500, currency: 'EGP' });
  });

  it('skips unpriced trips when picking the local tier', () => {
    expect(
      tripPriceRange([
        { price: 0, foreigner_price: 400, currency: 'EGP' },
        { price: 220, foreigner_price: 600, currency: 'EGP' },
      ]),
    ).toEqual({ localFrom: 220, foreignerFrom: 600, currency: 'EGP' });
  });

  it('falls back to EGP when a trip carries no currency', () => {
    expect(tripPriceRange([{ price: 180 }])?.currency).toBe('EGP');
  });
});
