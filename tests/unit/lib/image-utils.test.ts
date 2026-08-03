import { describe, expect, it } from 'vitest';
import { resolveImageUrl, getTripImage } from '@/lib/image-utils';

describe('image-utils', () => {
  it('returns local paths unchanged', () => {
    expect(resolveImageUrl('/logo.png')).toBe('/logo.png');
  });

  it('returns placeholder for empty trip images', () => {
    expect(getTripImage({ images: [] } as never)).toBeTruthy();
  });
});
