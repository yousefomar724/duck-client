import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { requireAdmin } from '@/server/auth/guard';
import { User } from '@/server/models/user';
import { errorResponse } from '@/server/lib/json';

export async function GET(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof NextResponse) return session;

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const roleParam = searchParams.get('role');

  // Fixes a Go-API bug (#5): omitting `?role=` defaulted to role 0, silently
  // returning only regular users instead of everyone. No filter -> all roles.
  let filter: Record<string, unknown> = {};
  if (roleParam !== null) {
    const role = Number(roleParam);
    if (!Number.isInteger(role)) return errorResponse(400, 'Invalid role');
    filter = { role };
  }

  const users = await User.find(filter);
  return NextResponse.json(users);
}
