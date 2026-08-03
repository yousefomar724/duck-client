import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAuth } from '@/server/auth/guard';
import { findActiveUserById } from '@/server/services/user';
import { errorResponse } from '@/server/lib/json';

export async function GET(request: Request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  await dbConnect();
  const user = await findActiveUserById(session.user_id);
  if (!user) return errorResponse(404, 'User not found');

  return NextResponse.json(user);
}
