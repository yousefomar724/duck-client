/** Local Egyptian mobile: 0 + (10|11|12|15) + 8 digits */
export const EGYPT_MOBILE_LOCAL_REGEX = /^0(10|11|12|15)\d{8}$/;

export function parseStoredPhoneToLocal(p: string): string | null {
  const d = p.replace(/\D/g, '');
  if (d.startsWith('20') && d.length === 12) {
    const rest = d.slice(2);
    if (/^1[0125]\d{8}$/.test(rest)) return `0${rest}`;
  }
  if (EGYPT_MOBILE_LOCAL_REGEX.test(d)) return d;
  if (d.length === 10 && /^1[0125]/.test(d)) return `0${d}`;
  return null;
}

export function localEgyptMobileToE164(localDigits: string): string {
  const d = localDigits.replace(/\D/g, '');
  return `+20${d.slice(1)}`;
}

/**
 * Convert a phone string to an E.164-style string (e.g. +201012345678).
 * Accepts:
 *  - E.164 input starting with '+' (validated to 7-15 digits)
 *  - International forms starting with '00'
 *  - Local Egyptian mobiles (010..., 011..., 012..., 015...)
 *  - Digits-only input that already includes a country code (7-15 digits)
 * Returns `+<digits>` on success or null if the input is not recognisable.
 */
export function phoneToE164(phone: string): string | null {
  if (!phone) return null;
  const raw = phone.trim();
  const digits = raw.replace(/\D/g, '');

  // Input already in +E.164 form
  if (raw.startsWith('+')) {
    if (digits.length >= 7 && digits.length <= 15) return `+${digits}`;
    return null;
  }

  // International 00 prefix -> convert to +
  if (raw.startsWith('00')) {
    const stripped = digits.replace(/^00/, '');
    if (stripped.length >= 7 && stripped.length <= 15) return `+${stripped}`;
  }

  // Local Egyptian mobile (010/011/012/015)
  if (EGYPT_MOBILE_LOCAL_REGEX.test(digits)) {
    return `+20${digits.slice(1)}`;
  }

  // Already includes country code (e.g. 2010...)
  if (digits.startsWith('20') && digits.length === 12) return `+${digits}`;

  // Fallback: digits that already look like a country code + subscriber number.
  // A leading 0 is a national trunk prefix, never valid after `+` in E.164.
  if (digits.length >= 7 && digits.length <= 15 && !digits.startsWith('0')) {
    return `+${digits}`;
  }

  return null;
}

/** Digits for `https://wa.me/<digits>` (no plus). */
export function phoneToWhatsAppDigits(phone: string): string | null {
  const local = parseStoredPhoneToLocal(phone);
  if (local) return `20${local.slice(1)}`;
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('20') && d.length >= 11) return d;
  if (d.length >= 10) return d;
  return null;
}
