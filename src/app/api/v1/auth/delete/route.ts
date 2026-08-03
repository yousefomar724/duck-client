import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { User } from '@/server/models/user';
import { Supplier } from '@/server/models/supplier';
import { errorResponse, messageResponse } from '@/server/lib/json';
import { isValidObjectId } from '@/server/lib/object-id';

export async function PATCH(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ?? '';
  if (!isValidObjectId(id)) return errorResponse(400, 'Invalid user ID');

  try {
    const now = new Date();
    await User.updateOne({ _id: id }, { deletedAt: now });
    await Supplier.updateMany({ user_id: id }, { deletedAt: now });
    return messageResponse('User deleted successfully');
  } catch {
    return errorResponse(500, 'Failed to delete user');
  }
}
