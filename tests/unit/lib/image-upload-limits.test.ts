import { describe, expect, it } from 'vitest';
import { MAX_UPLOAD_BYTES } from '@/lib/image-compression';
import {
  MAX_SIZE_BYTES,
  validateImageFile,
} from '@/server/lib/cloudinary';

describe('image upload size limit', () => {
  it('keeps the browser and server limits aligned at 20 MB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(20 * 1024 * 1024);
    expect(MAX_SIZE_BYTES).toBe(MAX_UPLOAD_BYTES);
  });

  it('accepts the 20 MB boundary and rejects one byte above it', () => {
    expect(() =>
      validateImageFile({ type: 'image/jpeg', size: MAX_SIZE_BYTES }),
    ).not.toThrow();
    expect(() =>
      validateImageFile({ type: 'image/jpeg', size: MAX_SIZE_BYTES + 1 }),
    ).toThrow('20MB');
  });
});
