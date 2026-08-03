import { describe, expect, it } from 'vitest';
import { resolveLocalized } from '@/server/lib/localize';

describe('resolveLocalized', () => {
  it('returns full object when lang is empty', () => {
    const value = { en: 'Hello', ar: 'مرحبا' };
    expect(resolveLocalized(value, '')).toEqual(value);
  });

  it('resolves english', () => {
    expect(resolveLocalized({ en: 'Hello', ar: 'مرحبا' }, 'en')).toBe('Hello');
  });

  it('resolves arabic', () => {
    expect(resolveLocalized({ en: 'Hello', ar: 'مرحبا' }, 'ar')).toBe('مرحبا');
  });

  it('falls back when locale missing', () => {
    expect(resolveLocalized({ en: 'Hello' }, 'ar')).toBe('Hello');
  });
});
