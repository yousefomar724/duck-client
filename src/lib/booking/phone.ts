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

/** Digits for `https://wa.me/<digits>` (no plus). */
export function phoneToWhatsAppDigits(phone: string): string | null {
  const local = parseStoredPhoneToLocal(phone);
  if (local) return `20${local.slice(1)}`;
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('20') && d.length >= 11) return d;
  if (d.length >= 10) return d;
  return null;
}
