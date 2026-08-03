import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { TourGuide } from '@/server/models/tourguide';
import { errorResponse } from '@/server/lib/json';

export async function GET() {
  await dbConnect();
  try {
    const guides = await TourGuide.find();
    return NextResponse.json(guides);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to list tour guides';
    return errorResponse(500, message);
  }
}

export async function POST(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  let body: { name?: string; price?: number; phone_number?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  try {
    // Fixes a Go-API bug (#7): the original handler echoed the request body
    // back (no `id`), instead of returning the created document.
    const guide = await TourGuide.create({
      name: body.name,
      price: body.price,
      phone_number: body.phone_number,
    });
    return NextResponse.json(guide, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to create tour guide';
    return errorResponse(500, message);
  }
}
