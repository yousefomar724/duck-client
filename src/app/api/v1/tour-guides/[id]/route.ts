import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { TourGuide } from '@/server/models/tourguide';
import { errorResponse, messageResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid ID');

  const guide = await TourGuide.findById(id);
  if (!guide) return errorResponse(404, 'Tour guide not found');

  return NextResponse.json(guide);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid ID');

  let body: { name?: string; price?: number; phone_number?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  try {
    const guide = await TourGuide.findById(id);
    if (!guide) return errorResponse(500, 'tour guide not found');
    guide.name = body.name ?? guide.name;
    guide.price = body.price ?? guide.price;
    guide.phone_number = body.phone_number ?? guide.phone_number;
    await guide.save();
    return messageResponse('Tour guide updated successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to update tour guide';
    return errorResponse(500, message);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid ID');

  try {
    await TourGuide.updateOne({ _id: id }, { deletedAt: new Date() });
    return messageResponse('Tour guide deleted successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to delete tour guide';
    return errorResponse(500, message);
  }
}
