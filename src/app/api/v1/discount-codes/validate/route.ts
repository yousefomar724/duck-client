import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { optionalAuth } from '@/server/auth/guard';
import { errorResponse } from '@/server/lib/json';
import { DiscountApplyError, isDiscountGuessFailure } from '@/server/services/discount';
import {
  DiscountCodeError,
  parseValidateBody,
  validateDiscountCode,
} from '@/server/services/discount-codes';
import {
  clientIp,
  DISCOUNT_GUESS_LIMIT,
  isRateLimited,
  recordRateLimitHit,
} from '@/server/lib/rate-limit';

export async function POST(request: Request) {
  await dbConnect();

  // Only wrong guesses count, so a customer whose total is re-checked on every
  // guest change is never locked out. The same counter is shared with
  // checkout, which would otherwise be a way around this limit.
  const ip = clientIp(request);
  if (await isRateLimited(DISCOUNT_GUESS_LIMIT, ip)) {
    return errorResponse(429, 'Too many attempts. Please try again later.', { code: 'RATE_LIMITED' });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }
  const body = parseValidateBody(raw);
  if (!body) return errorResponse(400, 'Invalid input');

  const session = optionalAuth(request);

  try {
    const result = await validateDiscountCode(body, session?.user_id ?? null);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DiscountApplyError) {
      if (isDiscountGuessFailure(err.code)) await recordRateLimitHit(DISCOUNT_GUESS_LIMIT, ip);
      return errorResponse(err.statusCode, err.message, { code: err.code });
    }
    if (err instanceof DiscountCodeError) return errorResponse(err.statusCode, err.message);
    const message = err instanceof Error ? err.message : 'failed to validate discount code';
    return errorResponse(500, message);
  }
}
