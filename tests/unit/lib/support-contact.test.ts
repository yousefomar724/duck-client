import { describe, expect, it } from 'vitest';
import { buildWhatsAppHref } from '@/lib/support-contact';

describe('support-contact', () => {
  it('builds whatsapp href', () => {
    expect(buildWhatsAppHref('hello')).toContain('wa.me');
    expect(buildWhatsAppHref('hello')).toContain('text=');
  });
});
