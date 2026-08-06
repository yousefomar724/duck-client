import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { Feedback } from '@/server/models/feedback';
import { errorResponse } from '@/server/lib/json';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateLimitMap.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (hits.length >= RATE_LIMIT_MAX) return true;
  hits.push(now);
  rateLimitMap.set(ip, hits);
  return false;
}

export async function GET(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const filter: Record<string, unknown> = {};
  if (status && ['new', 'read', 'archived'].includes(status)) {
    filter.status = status;
  }

  try {
    const feedback = await Feedback.find(filter).sort({ createdAt: -1 });
    return NextResponse.json(feedback);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to list feedback';
    return errorResponse(500, message);
  }
}

export async function POST(request: Request) {
  await dbConnect();

  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return errorResponse(429, 'Too many submissions. Please try again later.');
  }

  let body: {
    rating?: number;
    comment?: string;
    name?: string;
    contact?: string;
    context?: string;
    booking_ref?: string;
    page?: string;
    locale?: string;
    website?: string;
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  if (body.website) {
    return errorResponse(400, 'Invalid submission');
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return errorResponse(400, 'Rating must be between 1 and 5');
  }

  const comment = body.comment?.trim().slice(0, 1000) || undefined;
  const name = body.name?.trim().slice(0, 120) || undefined;
  const contact = body.contact?.trim().slice(0, 200) || undefined;
  const context = body.context === 'booking' ? 'booking' : 'general';
  const booking_ref = body.booking_ref?.trim().slice(0, 64) || undefined;
  const page = body.page?.trim().slice(0, 500) || undefined;
  const locale = body.locale?.trim().slice(0, 8) || undefined;

  try {
    const doc = await Feedback.create({
      rating,
      comment,
      name,
      contact,
      context,
      booking_ref,
      page,
      locale,
      status: 'new',
    });
    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to save feedback';
    return errorResponse(500, message);
  }
}
