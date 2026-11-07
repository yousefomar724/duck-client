import jwt from 'jsonwebtoken';

/**
 * Finance session tokens carry their own audience and issuer. Duck's
 * `verifyAuthToken` rejects any token with this audience, and this verifier
 * requires it, so a Duck token never opens a finance route and a finance
 * token never opens a Duck route — even though both may share JWT_SECRET.
 */
export const FINANCE_AUDIENCE = 'duck-finance';
const ISSUER = 'duck-finance';
const TOKEN_TYPE = 'finance_session';

export interface FinanceClaims {
  sub: string;
  typ: typeof TOKEN_TYPE;
  /** Must match the user's `tokenVersion`; bumping it revokes older tokens. */
  ver: number;
}

function secret(): string {
  const s = process.env.FINANCE_JWT_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

export function signFinanceToken(userId: string, tokenVersion: number): string {
  return jwt.sign({ typ: TOKEN_TYPE, ver: tokenVersion }, secret(), {
    subject: userId,
    audience: FINANCE_AUDIENCE,
    issuer: ISSUER,
    expiresIn: '12h',
    algorithm: 'HS256',
  });
}

export function verifyFinanceToken(token: string): FinanceClaims {
  const decoded = jwt.verify(token, secret(), {
    audience: FINANCE_AUDIENCE,
    issuer: ISSUER,
    algorithms: ['HS256'],
  }) as jwt.JwtPayload;
  if (decoded.typ !== TOKEN_TYPE || typeof decoded.sub !== 'string' || typeof decoded.ver !== 'number') {
    throw new Error('invalid token type');
  }
  return { sub: decoded.sub, typ: TOKEN_TYPE, ver: decoded.ver };
}
