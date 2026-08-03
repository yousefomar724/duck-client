import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { findActiveUserById } from '@/server/services/user';
import { ImageStorage } from '@/server/models/image-storage';
import { uploadImageBuffer, deleteImage } from '@/server/lib/cloudinary';
import { errorResponse } from '@/server/lib/json';

export async function POST(request: Request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  await dbConnect();
  const user = await findActiveUserById(session.user_id);
  if (!user || user.role !== 2) {
    return errorResponse(403, 'unauthorized: user is not an admin');
  }

  const formData = await request.formData();
  const file = formData.get('image');
  if (!file || !(file instanceof File)) {
    return errorResponse(400, 'Image file is required');
  }

  let uploaded;
  try {
    uploaded = await uploadImageBuffer(file);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'upload failed';
    return errorResponse(500, message);
  }

  try {
    const image = await ImageStorage.create({
      user_id: user._id,
      supplier_id: null,
      image_url: uploaded.url,
      public_id: uploaded.publicId,
    });
    return NextResponse.json(image, { status: 201 });
  } catch (err) {
    await deleteImage(uploaded.publicId);
    const message = err instanceof Error ? err.message : 'failed to save image';
    return errorResponse(500, message);
  }
}
