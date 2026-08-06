import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { Feedback } from '@/server/models/feedback';
import { errorResponse, messageResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid ID');

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  if (!body.status || !['new', 'read', 'archived'].includes(body.status)) {
    return errorResponse(400, 'Invalid status');
  }

  try {
    const doc = await Feedback.findById(id);
    if (!doc) return errorResponse(404, 'Feedback not found');
    doc.status = body.status as 'new' | 'read' | 'archived';
    await doc.save();
    return messageResponse('Feedback updated successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to update feedback';
    return errorResponse(500, message);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid ID');

  try {
    await Feedback.updateOne({ _id: id }, { deletedAt: new Date() });
    return messageResponse('Feedback deleted successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to delete feedback';
    return errorResponse(500, message);
  }
}
