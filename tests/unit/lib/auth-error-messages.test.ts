import { describe, expect, it } from 'vitest';
import { resolveAuthErrorToKey } from '@/lib/auth/error-messages';

describe('resolveAuthErrorToKey', () => {
  it('maps network errors', () => {
    expect(resolveAuthErrorToKey('Failed to fetch')).toBe('networkError');
  });

  it('maps http status errors', () => {
    expect(resolveAuthErrorToKey('HTTP 500')).toBe('httpError');
  });

  it('maps unauthorized to session expired', () => {
    expect(resolveAuthErrorToKey('Unauthorized')).toBe('sessionExpired');
  });

  it('falls back for unknown errors', () => {
    expect(resolveAuthErrorToKey('')).toBe('somethingWentWrong');
    expect(resolveAuthErrorToKey('random')).toBe('somethingWentWrong');
  });
});
