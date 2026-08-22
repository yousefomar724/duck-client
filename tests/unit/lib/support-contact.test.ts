import { describe, expect, it } from 'vitest';
import { buildWhatsAppHref, INSTAPAY_LINK } from '@/lib/support-contact';

describe('support-contact', () => {
  it('builds whatsapp href', () => {
    expect(buildWhatsAppHref('hello')).toContain('wa.me');
    expect(buildWhatsAppHref('hello')).toContain('text=');
  });

  it('exports the InstaPay link', () => {
    expect(INSTAPAY_LINK).toContain('instapay');
  });
});
