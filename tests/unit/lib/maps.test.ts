import { describe, expect, it } from 'vitest';
import { buildGoogleMapsUrl } from '@/lib/maps';

describe('maps', () => {
  it('builds google maps url', () => {
    expect(buildGoogleMapsUrl(24.0, 32.0)).toContain('google.com/maps');
    expect(buildGoogleMapsUrl(24.0, 32.0)).toContain('24');
  });
});
