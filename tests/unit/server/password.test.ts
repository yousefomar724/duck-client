import { describe, expect, it } from 'vitest';
import { hashPassword, comparePassword } from '@/server/auth/password';

describe('password', () => {
  it('hashes and compares successfully', async () => {
    const hash = await hashPassword('secret123');
    expect(await comparePassword('secret123', hash)).toBe(true);
    expect(await comparePassword('wrong', hash)).toBe(false);
  });
});
