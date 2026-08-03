import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  signAuthToken,
  verifyAuthToken,
  signResetToken,
  verifyResetToken,
} from '@/server/auth/jwt';

describe('jwt', () => {
  it('round-trips auth token', () => {
    const token = signAuthToken({ user_id: 'abc', role: 1 });
    expect(verifyAuthToken(token)).toMatchObject({ user_id: 'abc', role: 1 });
  });

  it('round-trips reset token', () => {
    const token = signResetToken('user-1');
    expect(verifyResetToken(token).user_id).toBe('user-1');
  });

  it('rejects wrong token type for reset', () => {
    const token = signAuthToken({ user_id: 'abc', role: 0 });
    expect(() => verifyResetToken(token)).toThrow();
  });

  it('rejects expired token', () => {
    const token = jwt.sign(
      { user_id: 'abc', role: 0 },
      process.env.JWT_SECRET!,
      { expiresIn: -1 },
    );
    expect(() => verifyAuthToken(token)).toThrow();
  });
});
