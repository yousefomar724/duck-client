import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDate,
  isPaidPayoutStatus,
} from '@/lib/constants';

describe('constants formatters', () => {
  it('formats currency without trailing .00 and uses Western digits', () => {
    expect(formatCurrency(180, 'EGP', 'en')).toMatch(/180/)
    expect(formatCurrency(180, 'EGP', 'en')).not.toMatch(/\.00/)
    expect(formatCurrency(180, 'EGP', 'ar')).toMatch(/180/)
    expect(formatCurrency(180, 'EGP', 'ar')).not.toMatch(/[٠-٩]/)
    expect(formatCurrency(180.5, 'EGP', 'en')).toMatch(/180\.5/)
  });

  it('formats date', () => {
    expect(formatDate('2026-08-03')).toBeTruthy();
  });

  it('detects paid payout statuses', () => {
    expect(isPaidPayoutStatus('paid')).toBe(true);
    expect(isPaidPayoutStatus('pending')).toBe(false);
  });
});
