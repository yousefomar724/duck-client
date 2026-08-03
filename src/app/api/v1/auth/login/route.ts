import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { User } from '@/server/models/user';
import { Supplier } from '@/server/models/supplier';
import { Wallet } from '@/server/models/wallet';
import { comparePassword } from '@/server/auth/password';
import { signAuthToken } from '@/server/auth/jwt';
import { verifyGoogleIdToken } from '@/server/auth/google';
import { findActiveUserByEmail, findActiveUserByGoogleId } from '@/server/services/user';
import { errorResponse } from '@/server/lib/json';

interface LoginBody {
  email?: string;
  password?: string;
  role?: 0 | 1;
  google_token?: string;
}

export async function POST(request: Request) {
  await dbConnect();

  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  try {
    const token = body.google_token
      ? await loginWithGoogle(body.google_token, body.role)
      : await loginWithPassword(body.email ?? '', body.password ?? '');
    return NextResponse.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid credentials';
    return errorResponse(401, message);
  }
}

async function loginWithPassword(email: string, password: string): Promise<string> {
  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new Error('invalid credentials');

  // Fixes a Go-API bug: the original guard was `password == nil && !active`,
  // then unconditionally dereferenced the password — a nil-pointer panic for
  // an *active* Google-only user attempting a password login. Any user
  // without a password (Google-only) simply fails password login here.
  if (!user.password) throw new Error('invalid credentials');

  const valid = await comparePassword(password, user.password);
  if (!valid) throw new Error('invalid credentials');

  return signAuthToken({ user_id: user.id, role: user.role });
}

async function loginWithGoogle(idToken: string, role?: 0 | 1): Promise<string> {
  const profile = await verifyGoogleIdToken(idToken);

  const byGoogleId = await findActiveUserByGoogleId(profile.googleId);
  if (byGoogleId) return signAuthToken({ user_id: byGoogleId.id, role: byGoogleId.role });

  const byEmail = await findActiveUserByEmail(profile.email);
  if (byEmail) {
    byEmail.google_id = profile.googleId;
    await byEmail.save();
    return signAuthToken({ user_id: byEmail.id, role: byEmail.role });
  }

  if (role !== 0 && role !== 1) {
    throw new Error('role is required for new google user');
  }

  const newUser = await User.create({
    username: profile.email,
    email: profile.email,
    role,
    first_name: profile.firstName,
    last_name: profile.lastName,
    google_id: profile.googleId,
  });

  if (role === 1) {
    const fullName = `${profile.firstName} ${profile.lastName}`;
    const supplier = await Supplier.create({
      user_id: newUser._id,
      email: profile.email,
      name: { en: fullName, ar: fullName },
      about: { en: '', ar: '' },
      icon: '',
    });
    const wallet = await Wallet.create({ user_id: newUser._id, amount: 0, supplier_id: supplier._id });
    newUser.supplier_id = supplier._id;
    newUser.wallet_id = wallet._id;
    await newUser.save();
  }

  return signAuthToken({ user_id: newUser.id, role: newUser.role });
}
