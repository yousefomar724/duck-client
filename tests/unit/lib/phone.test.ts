import { describe, expect, it } from 'vitest';
import {
  EGYPT_MOBILE_LOCAL_REGEX,
  parseStoredPhoneToLocal,
  localEgyptMobileToE164,
  phoneToE164,
} from '@/lib/booking/phone';

describe('phone', () => {
  it('validates local egyptian mobile regex', () => {
    expect(EGYPT_MOBILE_LOCAL_REGEX.test('01012345678')).toBe(true);
    expect(EGYPT_MOBILE_LOCAL_REGEX.test('02012345678')).toBe(false);
  });

  it('parses stored e164 to local', () => {
    expect(parseStoredPhoneToLocal('+201012345678')).toBe('01012345678');
    expect(parseStoredPhoneToLocal('01012345678')).toBe('01012345678');
  });

  it('converts local to e164', () => {
    expect(localEgyptMobileToE164('01012345678')).toBe('+201012345678');
  });

  it('normalizes international inputs to E.164', () => {
    expect(phoneToE164('+201012345678')).toBe('+201012345678');
    expect(phoneToE164('00201012345678')).toBe('+201012345678');
    expect(phoneToE164('201012345678')).toBe('+201012345678');
    expect(phoneToE164('+447911123456')).toBe('+447911123456');
    // fallback: digits-only accepted when length looks reasonable
    expect(phoneToE164('7911123456')).toBe('+7911123456');
  });
});
