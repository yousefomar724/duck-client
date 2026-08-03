import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { findActiveUserById } from '@/server/services/user';
import { ImageStorage } from '@/server/models/image-storage';
import { uploadImageBuffer, deleteImage } from '@/server/lib/cloudinary';
import { errorResponse, messageResponse } from '@/server/lib/json';

async function loadOwnedImage(imageId: string, userId: string) {
  const image = await ImageStorage.findById(imageId).select('+public_id');
  if (!image) throw new Error('record not found');
  const user = await findActiveUserById(userId);
  if (!user) throw new Error('user not found');
  if (!user.supplier_id || !image.supplier_id || image.supplier_id.toString() !== user.supplier_id.toString()) {
    throw new Error('unauthorized: image does not belong to supplier');
  }
  return image;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  try {
    const image = await loadOwnedImage(id, session.user_id);
    return NextResponse.json(image);
  } catch (err) {
    // Go returns 403 for every GetImage error, including not-found.
    const message = err instanceof Error ? err.message : 'unauthorized';
    return errorResponse(403, message);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get('image');
  if (!file || !(file instanceof File)) {
    return errorResponse(400, 'Image file is required');
  }

  try {
    const image = await loadOwnedImage(id, session.user_id);
    const oldPublicId = image.public_id;
    const uploaded = await uploadImageBuffer(file);
    image.image_url = uploaded.url;
    image.public_id = uploaded.publicId;
    await image.save();
    await deleteImage(oldPublicId);
    return NextResponse.json(image);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to update image';
    return errorResponse(500, message);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  await dbConnect();

  const { id } = await params;
  try {
    const image = await loadOwnedImage(id, session.user_id);
    await deleteImage(image.public_id);
    image.deletedAt = new Date();
    await image.save();
    return messageResponse('Image deleted successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to delete image';
    return errorResponse(500, message);
  }
}
