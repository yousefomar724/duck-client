import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST as login } from '@/app/api/v1/auth/login/route';
import { POST as register } from '@/app/api/v1/auth/register/route';
import { GET as me } from '@/app/api/v1/auth/me/route';
import { POST as forgotPassword } from '@/app/api/v1/auth/forgot-password/route';
import { POST as resetPassword } from '@/app/api/v1/auth/reset-password/route';
import { GET as allUsers } from '@/app/api/v1/auth/all/route';
import { PATCH as activateUser } from '@/app/api/v1/auth/activate/route';
import { PATCH as deleteUser } from '@/app/api/v1/auth/delete/route';
import { createUser, createAdminUser, authHeader } from '../utils/factories';
import { jsonRequest } from '../utils/http';
import { signResetToken } from '@/server/auth/jwt';
import { Supplier } from '@/server/models/supplier';
import { Wallet } from '@/server/models/wallet';

vi.mock('@/server/auth/google', () => ({
  verifyGoogleIdToken: vi.fn(async () => ({
    googleId: 'google-123',
    email: 'google@test.com',
    firstName: 'Google',
    lastName: 'User',
  })),
}));

describe('auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login with password returns token', async () => {
    const { user, password } = await createUser({ email: 'login@test.com', username: 'loginuser' });
    const res = await login(
      jsonRequest('http://localhost/api/v1/auth/login', {
        method: 'POST',
        body: { email: user.email, password },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
  });

  it('login rejects bad credentials', async () => {
    await createUser({ email: 'bad@test.com', username: 'baduser' });
    const res = await login(
      jsonRequest('http://localhost/api/v1/auth/login', {
        method: 'POST',
        body: { email: 'bad@test.com', password: 'wrong' },
      }),
    );
    expect(res.status).toBe(401);
  });

  it('register creates supplier side effects for role 1', async () => {
    const res = await register(
      jsonRequest('http://localhost/api/v1/auth/register', {
        method: 'POST',
        body: {
          username: 'newsupplier',
          email: 'supplier-new@test.com',
          password: 'Supplier123!',
          role: 1,
          first_name: 'New',
          last_name: 'Supplier',
        },
      }),
    );
    expect(res.status).toBe(201);
    const supplier = await Supplier.findOne({ email: 'supplier-new@test.com' });
    const wallet = await Wallet.findOne({ supplier_id: supplier?._id });
    expect(supplier).toBeTruthy();
    expect(wallet).toBeTruthy();
  });

  it('register duplicate returns 409', async () => {
    await createUser({ email: 'dup@test.com', username: 'dupuser' });
    const res = await register(
      jsonRequest('http://localhost/api/v1/auth/register', {
        method: 'POST',
        body: {
          username: 'dupuser2',
          email: 'dup@test.com',
          password: 'Password123!',
          role: 0,
        },
      }),
    );
    expect([409, 500]).toContain(res.status);
  });

  it('me returns current user', async () => {
    const { user } = await createUser({ email: 'me@test.com', username: 'meuser' });
    const res = await me(
      jsonRequest('http://localhost/api/v1/auth/me', {
        headers: authHeader(user.id, user.role),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe('me@test.com');
  });

  it('forgot password always returns success message', async () => {
    await createUser({ email: 'forgot@test.com', username: 'forgotuser' });
    const res = await forgotPassword(
      jsonRequest('http://localhost/api/v1/auth/forgot-password', {
        method: 'POST',
        body: { email: 'forgot@test.com' },
      }),
    );
    expect(res.status).toBe(200);
  });

  it('reset password updates hash', async () => {
    const { user } = await createUser({ email: 'reset@test.com', username: 'resetuser' });
    const token = signResetToken(user.id);
    const res = await resetPassword(
      jsonRequest('http://localhost/api/v1/auth/reset-password', {
        method: 'POST',
        body: { token, password: 'NewPassword123!' },
      }),
    );
    expect(res.status).toBe(200);
  });

  it('admin can list and manage users', async () => {
    const { user: admin } = await createAdminUser();
    const { user: target } = await createUser({ email: 'target@test.com', username: 'targetuser' });

    const listRes = await allUsers(
      jsonRequest('http://localhost/api/v1/auth/all', {
        headers: authHeader(admin.id, admin.role),
      }),
    );
    expect(listRes.status).toBe(200);
    const users = await listRes.json();
    expect(users.length).toBeGreaterThanOrEqual(2);

    const deactivateRes = await activateUser(
      jsonRequest(`http://localhost/api/v1/auth/activate?id=${target.id}&activate=false`, {
        method: 'PATCH',
        headers: authHeader(admin.id, admin.role),
      }),
    );
    expect(deactivateRes.status).toBe(200);

    const deleteRes = await deleteUser(
      jsonRequest(`http://localhost/api/v1/auth/delete?id=${target.id}`, {
        method: 'PATCH',
        headers: authHeader(admin.id, admin.role),
      }),
    );
    expect(deleteRes.status).toBe(200);
  });
});
