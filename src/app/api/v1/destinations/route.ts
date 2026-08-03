import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { Destination } from '@/server/models/destination';
import { toDestinationResponse } from '@/server/services/trip';
import { errorResponse } from '@/server/lib/json';

export async function GET(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') ?? '';
  const status = searchParams.get('status');
  const publicStatus = searchParams.get('public_status');

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (publicStatus) filter.public_status = publicStatus;

  try {
    const destinations = await Destination.find(filter);
    const responses = destinations.map((d) => toDestinationResponse(d.toJSON(), lang));
    return NextResponse.json(responses);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to list destinations';
    return errorResponse(500, message);
  }
}

export async function POST(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  try {
    const destination = await Destination.create(body);
    return NextResponse.json(destination, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to create destination';
    return errorResponse(500, message);
  }
}
