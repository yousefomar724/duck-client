import { dbConnect } from '@/server/db/connect';
import { User } from '@/server/models/user';
import { verifyResetToken } from '@/server/auth/jwt';
import { hashPassword } from '@/server/auth/password';
import { errorResponse, messageResponse } from '@/server/lib/json';

export async function POST(request: Request) {
  await dbConnect();

  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  let userId: string;
  try {
    const claims = verifyResetToken(body.token ?? '');
    userId = claims.user_id;
  } catch (err) {
    const message = err instanceof Error && err.message === 'invalid token type'
      ? 'invalid token type'
      : 'invalid or expired token';
    return errorResponse(400, message);
  }

  const user = await User.findById(userId);
  if (!user) {
    return errorResponse(400, 'user not found');
  }

  user.password = await hashPassword(body.password ?? '');
  await user.save();

  return messageResponse('Password reset successfully');
}
