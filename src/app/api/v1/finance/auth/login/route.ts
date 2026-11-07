import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { errorResponse } from '@/server/lib/json';
import { clientIp, isRateLimited, recordRateLimitHit, type RateLimitRule } from '@/server/lib/rate-limit';
import { toErrorResponse } from '@/server/finance/http';
import { getFinanceModels } from '@/server/finance/models';
import { FinanceError } from '@/server/finance/services/context';
import { ensureFinanceSeed } from '@/server/finance/services/seed';
import { login } from '@/server/finance/services/users';

/** Failed finance logins allowed per IP before a 15-minute cool-down. */
const FINANCE_LOGIN_LIMIT: RateLimitRule = { name: 'finance-login', windowMs: 15 * 60 * 1000, max: 10 };

/** `{username, password}` → `{token, user}`. The only finance route without a bearer token. */
export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid JSON body');
  }

  try {
    await dbConnect();
    await ensureFinanceSeed();
    const ip = clientIp(request);
    if (await isRateLimited(FINANCE_LOGIN_LIMIT, ip)) {
      return errorResponse(429, 'Too many failed attempts. Try again later.');
    }
    try {
      return NextResponse.json(await login(getFinanceModels(), body.username, body.password));
    } catch (err) {
      if (err instanceof FinanceError && err.status === 401) await recordRateLimitHit(FINANCE_LOGIN_LIMIT, ip);
      throw err;
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}
