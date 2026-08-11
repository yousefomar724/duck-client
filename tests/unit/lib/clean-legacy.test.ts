import { describe, expect, it } from 'vitest';
import { cleanLegacy } from '@/lib/trips/clean-legacy';

describe('cleanLegacy', () => {
  it('scrubs the legacy empty-array default', () => {
    expect(cleanLegacy('[]')).toBe('');
  });

  it('scrubs the legacy empty-object default', () => {
    expect(cleanLegacy('{}')).toBe('');
  });

  it('trims surrounding whitespace', () => {
    expect(cleanLegacy('  []  ')).toBe('');
    expect(cleanLegacy('  hello  ')).toBe('hello');
  });

  it('leaves real content untouched', () => {
    expect(cleanLegacy('* يوميًا من 8 صباحًا حتى 5 مساءً')).toBe(
      '* يوميًا من 8 صباحًا حتى 5 مساءً',
    );
  });
});
