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

/** Audience of finance (ERP) session tokens — see src/server/finance/auth/jwt.ts. */
const FINANCE_AUDIENCE = 'duck-finance';

export function verifyAuthToken(token: string): AuthClaims {
  const decoded = jwt.verify(token, secret()) as jwt.JwtPayload;
  // Finance tokens may share JWT_SECRET; they must never pass as a Duck session.
  const aud = decoded.aud;
  if (aud === FINANCE_AUDIENCE || (Array.isArray(aud) && aud.includes(FINANCE_AUDIENCE))) {
    throw new Error('invalid token audience');
  }
  if (typeof decoded.user_id !== 'string' || ![0, 1, 2].includes(decoded.role)) {
    throw new Error('invalid token claims');
  }
  return decoded as unknown as AuthClaims;
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
