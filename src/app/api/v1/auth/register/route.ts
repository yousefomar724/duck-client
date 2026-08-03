import { dbConnect } from '@/server/db/connect';
import { User } from '@/server/models/user';
import { Supplier } from '@/server/models/supplier';
import { Wallet } from '@/server/models/wallet';
import { hashPassword } from '@/server/auth/password';
import { errorResponse, messageResponse } from '@/server/lib/json';

interface RegisterBody {
  username: string;
  email: string;
  password?: string;
  role: 0 | 1 | 2;
  first_name: string;
  last_name: string;
  phone_number?: string;
}

export async function POST(request: Request) {
  await dbConnect();

  let body: RegisterBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid input');
  }

  try {
    const passwordHash = body.password ? await hashPassword(body.password) : null;

    const user = await User.create({
      username: body.username,
      email: body.email,
      password: passwordHash,
      role: body.role,
      first_name: body.first_name,
      last_name: body.last_name,
      phone_number: body.phone_number ?? null,
    });

    if (user.role === 1) {
      const fullName = `${body.first_name} ${body.last_name}`;
      const supplier = await Supplier.create({
        user_id: user._id,
        email: body.email,
        name: { en: fullName, ar: fullName },
        about: { en: '', ar: '' },
        icon: '',
      });
      const wallet = await Wallet.create({ user_id: user._id, amount: 0, supplier_id: supplier._id });
      user.supplier_id = supplier._id;
      user.wallet_id = wallet._id;
      await user.save();
    }

    return messageResponse('User registered successfully', 201);
  } catch (err) {
    const mongoErr = err as { code?: number; keyPattern?: Record<string, unknown> };
    if (mongoErr.code === 11000) {
      const key = mongoErr.keyPattern ? Object.keys(mongoErr.keyPattern)[0] : '';
      if (key === 'email') return errorResponse(409, 'Email already registered');
      if (key === 'username') return errorResponse(409, 'Username already taken');
      return errorResponse(409, 'Account already exists');
    }
    return errorResponse(500, 'Failed to register user');
  }
}
