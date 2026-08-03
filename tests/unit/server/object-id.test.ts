import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { isValidObjectId } from '@/server/lib/object-id';

describe('isValidObjectId', () => {
  it('accepts valid ObjectId strings', () => {
    const id = new mongoose.Types.ObjectId().toString();
    expect(isValidObjectId(id)).toBe(true);
  });

  it('rejects invalid strings', () => {
    expect(isValidObjectId('not-an-id')).toBe(false);
    expect(isValidObjectId('')).toBe(false);
  });
});
