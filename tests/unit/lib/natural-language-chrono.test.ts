import { describe, expect, it } from 'vitest';
import {
  normalizeNaturalLanguageForChrono,
  parseNaturalLanguageToBookingDate,
} from '@/lib/booking/natural-language-chrono';

describe('natural-language-chrono', () => {
  it('normalizes arabic digits and words', () => {
    const result = normalizeNaturalLanguageForChrono('غدا الساعة ٣', 'ar');
    expect(result.toLowerCase()).toContain('tomorrow');
  });

  it('parses english tomorrow with fallback time', () => {
    const ref = new Date('2026-08-03T10:00:00');
    const fallback = new Date('2026-08-03T14:30:00');
    const parsed = parseNaturalLanguageToBookingDate('tomorrow', 'en', ref, fallback);
    expect(parsed).not.toBeNull();
    expect(parsed!.getDate()).toBe(4);
  });
});
