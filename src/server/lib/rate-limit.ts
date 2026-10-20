import { RateLimitHit } from '../models/rate-limit-hit';

export interface RateLimitRule {
  /** Namespace so separate limits never share a counter. */
  name: string;
  windowMs: number;
  max: number;
}

/** Wrong discount-code guesses allowed per IP, across validate and checkout. */
export const DISCOUNT_GUESS_LIMIT: RateLimitRule = {
  name: 'discount-guess',
  windowMs: 10 * 60 * 1000,
  max: 10,
};

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

function windowKey(rule: RateLimitRule, subject: string, now: number) {
  const window = Math.floor(now / rule.windowMs);
  return { id: `${rule.name}:${subject}:${window}`, expiresAt: new Date((window + 1) * rule.windowMs) };
}

/** True once `subject` has used up its attempts in the current window. */
export async function isRateLimited(rule: RateLimitRule, subject: string): Promise<boolean> {
  const { id } = windowKey(rule, subject, Date.now());
  const hit = await RateLimitHit.findById(id).lean<{ count: number }>();
  return (hit?.count ?? 0) >= rule.max;
}

/** Records one attempt against `subject`. Atomic, so parallel requests all count. */
export async function recordRateLimitHit(rule: RateLimitRule, subject: string): Promise<void> {
  const { id, expiresAt } = windowKey(rule, subject, Date.now());
  await RateLimitHit.updateOne(
    { _id: id },
    { $inc: { count: 1 }, $setOnInsert: { expires_at: expiresAt } },
    { upsert: true },
  );
}
