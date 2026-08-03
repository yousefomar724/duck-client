import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import ar from '../../../messages/ar.json';

function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return collectKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

describe('messages parity', () => {
  it('has identical key sets in en and ar', () => {
    const enKeys = new Set(collectKeys(en as Record<string, unknown>));
    const arKeys = new Set(collectKeys(ar as Record<string, unknown>));
    const missingInAr = [...enKeys].filter((k) => !arKeys.has(k));
    const missingInEn = [...arKeys].filter((k) => !enKeys.has(k));
    expect(missingInAr).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  it('has no empty string leaves in en', () => {
    const leaves = collectKeys(en as Record<string, unknown>)
      .map((key) => {
        const parts = key.split('.');
        let current: unknown = en;
        for (const part of parts) {
          current = (current as Record<string, unknown>)[part];
        }
        return { key, value: current };
      })
      .filter(({ value }) => typeof value === 'string');
    const empty = leaves.filter(({ value }) => value === '');
    expect(empty).toEqual([]);
  });
});
