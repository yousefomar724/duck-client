import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { Destination } from '@/server/models/destination';
import { toDestinationResponse } from '@/server/services/trip';
import { errorResponse, messageResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') ?? '';

  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid destination ID');

  const destination = await Destination.findById(id);
  if (!destination) return errorResponse(404, 'destination not found');

  return NextResponse.json(toDestinationResponse(destination.toJSON(), lang));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid destination ID');

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  try {
    const destination = await Destination.findByIdAndUpdate(id, body, { new: true });
    if (!destination) return errorResponse(500, 'destination not found');
    return NextResponse.json(destination);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to update destination';
    return errorResponse(500, message);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid destination ID');

  try {
    await Destination.updateOne({ _id: id }, { deletedAt: new Date() });
    return messageResponse('Destination deleted successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to delete destination';
    return errorResponse(500, message);
  }
}
