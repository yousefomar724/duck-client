import { describe, expect, it } from 'vitest';
import {
  parseDurationHours,
  tripDurationText,
} from '@/lib/trips/duration';

describe('parseDurationHours', () => {
  it('returns the largest number in a range', () => {
    expect(parseDurationHours('2 to 3 hours')).toBe(3);
  });

  it('parses Arabic-Indic digits', () => {
    expect(parseDurationHours('من ساعتين إلى ٣ ساعات')).toBe(3);
  });

  it('returns null when no number is present', () => {
    expect(parseDurationHours('half a day')).toBeNull();
    expect(parseDurationHours('')).toBeNull();
  });
});

describe('tripDurationText', () => {
  it('returns the locale string when set', () => {
    expect(
      tripDurationText(
        { duration_text: { ar: 'من ساعتين إلى ٣ ساعات', en: '2 to 3 hours' } },
        'en',
      ),
    ).toBe('2 to 3 hours');
    expect(
      tripDurationText(
        { duration_text: { ar: 'من ساعتين إلى ٣ ساعات', en: '2 to 3 hours' } },
        'ar',
      ),
    ).toBe('من ساعتين إلى ٣ ساعات');
  });

  it('returns null for empty text so callers fall back to numeric duration', () => {
    expect(tripDurationText({ duration_text: { ar: '', en: '' } }, 'en')).toBeNull();
    expect(tripDurationText({}, 'en')).toBeNull();
  });
});
