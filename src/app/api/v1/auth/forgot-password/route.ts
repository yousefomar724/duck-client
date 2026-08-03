import { dbConnect } from '@/server/db/connect';
import { findActiveUserByEmail } from '@/server/services/user';
import { signResetToken } from '@/server/auth/jwt';
import { sendResetPasswordEmail } from '@/server/lib/mail';
import { errorResponse, messageResponse } from '@/server/lib/json';

export async function POST(request: Request) {
  await dbConnect();

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  try {
    const user = await findActiveUserByEmail(body.email ?? '');
    if (user) {
      const token = signResetToken(user.id);
      await sendResetPasswordEmail(user.email, token);
    }
    // Do not reveal whether the account exists.
    return messageResponse('If an account exists, a reset link has been sent');
  } catch {
    return errorResponse(500, 'Failed to process request');
  }
}
