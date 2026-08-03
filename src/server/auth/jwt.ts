import jwt from 'jsonwebtoken';

export interface AuthClaims {
  user_id: string;
  role: 0 | 1 | 2;
}

export interface ResetClaims {
  user_id: string;
  type: 'reset_password';
}

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

/** 72h session token — same lifetime and claim names as the Go API. */
export function signAuthToken(claims: AuthClaims): string {
  return jwt.sign(claims, secret(), { expiresIn: '72h' });
}

export function verifyAuthToken(token: string): AuthClaims {
  return jwt.verify(token, secret()) as unknown as AuthClaims;
}

/** 1h password-reset token, distinguished from session tokens by `type`. */
export function signResetToken(userId: string): string {
  const claims: ResetClaims = { user_id: userId, type: 'reset_password' };
  return jwt.sign(claims, secret(), { expiresIn: '1h' });
}

export function verifyResetToken(token: string): ResetClaims {
  const decoded = jwt.verify(token, secret()) as unknown as ResetClaims;
  if (decoded.type !== 'reset_password') {
    throw new Error('invalid token type');
  }
  return decoded;
}
