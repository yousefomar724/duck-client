import { describe, expect, it } from 'vitest';
import { formatSupplierResponse } from '@/server/services/supplier';

describe('formatSupplierResponse', () => {
  it('resolves localized name and about', () => {
    const supplier = {
      id: 's1',
      user_id: { toString: () => 'u1' },
      name: { en: 'DUCK', ar: 'داك' },
      about: { en: 'About', ar: 'حول' },
      icon: '/icon.png',
      rate: 5,
    } as Parameters<typeof formatSupplierResponse>[0];

    expect(formatSupplierResponse(supplier, 'en')).toMatchObject({
      id: 's1',
      name: 'DUCK',
      about: 'About',
      email: '',
    });
  });
});
