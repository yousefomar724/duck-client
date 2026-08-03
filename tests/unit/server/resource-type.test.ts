import { describe, expect, it } from 'vitest';
import { isValidResourceType } from '@/server/services/resource-type';

describe('isValidResourceType', () => {
  it('accepts allowed types', () => {
    expect(isValidResourceType('kayak')).toBe(true);
    expect(isValidResourceType('water_cycle')).toBe(true);
    expect(isValidResourceType('sup')).toBe(true);
  });

  it('rejects unknown types', () => {
    expect(isValidResourceType('boat')).toBe(false);
    expect(isValidResourceType('')).toBe(false);
  });
});
