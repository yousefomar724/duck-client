import { describe, expect, it } from 'vitest';
import {
  EGYPT_MOBILE_LOCAL_REGEX,
  parseStoredPhoneToLocal,
  localEgyptMobileToE164,
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
});
