import { beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/v1/finance/auth/login/route';
import { GET as me } from '@/app/api/v1/finance/auth/me/route';
import { GET as getState } from '@/app/api/v1/finance/state/route';
import { GET as listUsers, POST as createUser } from '@/app/api/v1/finance/users/route';
import { PUT as updateUser } from '@/app/api/v1/finance/users/[id]/route';
import { POST as createInvoice } from '@/app/api/v1/finance/invoices/route';
import { POST as createCustomRole } from '@/app/api/v1/finance/custom-roles/route';
import { POST as lockPeriod } from '@/app/api/v1/finance/periods/[id]/lock/route';
import { GET as duckMe } from '@/app/api/v1/auth/me/route';
import { createUser as createDuckUser, authHeader } from '../utils/factories';
import { jsonRequest } from '../utils/http';
import { createFinanceUser, ctxParams, finRequest, invoiceBody, periodIdOf, seedFinance, thisMonthDate } from '../utils/finance';

describe('finance auth', () => {
  beforeEach(async () => {
    await seedFinance();
  });

  it('logs in with username and password and returns {token, user}', async () => {
    const { user, password } = await createFinanceUser('Accountant', { username: 'nour' });
    const res = await login(finRequest('/auth/login', { method: 'POST', body: { username: 'NOUR', password } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.user).toMatchObject({ id: user._id, username: 'nour', role: 'Accountant' });
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.user.permissions).toContain('invoices:create');

    const meRes = await me(finRequest('/auth/me', { token: body.token }));
    expect(meRes.status).toBe(200);
    expect((await meRes.json()).user.id).toBe(user._id);
  });

  it('rejects a wrong password and an inactive account with 401', async () => {
    const { password } = await createFinanceUser('Cashier', { username: 'desk' });
    await createFinanceUser('Cashier', { username: 'gone', active: false });

    const wrong = await login(finRequest('/auth/login', { method: 'POST', body: { username: 'desk', password: 'nope-nope' } }));
    expect(wrong.status).toBe(401);
    const inactive = await login(finRequest('/auth/login', { method: 'POST', body: { username: 'gone', password } }));
    expect(inactive.status).toBe(401);
    expect(await inactive.json()).toEqual({ error: 'Invalid username or password' });
  });

  it('requires a bearer token on every route; the old x-user-id header grants nothing', async () => {
    const { user } = await createFinanceUser('Super Admin');
    const res = await getState(finRequest('/state', { headers: { 'x-user-id': user._id } }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Missing Authorization header' });

    const garbage = await getState(finRequest('/state', { token: 'not-a-jwt' }));
    expect(garbage.status).toBe(401);
  });

  it('rejects a Duck token on finance routes, and a finance token on Duck routes', async () => {
    const { user: duckAdmin } = await createDuckUser({ role: 2, username: 'duckadmin', email: 'duckadmin@test.com' });
    const duckToken = authHeader(duckAdmin.id, 2).Authorization.slice('Bearer '.length);
    const finRes = await getState(finRequest('/state', { token: duckToken }));
    expect(finRes.status).toBe(401);

    const { token: financeToken } = await createFinanceUser('Super Admin');
    const duckRes = await duckMe(jsonRequest('http://localhost/api/v1/auth/me', { token: financeToken }));
    expect(duckRes.status).toBe(401);
  });

  it('enforces role permissions server-side with 403', async () => {
    const { token: auditor } = await createFinanceUser('Auditor');
    const { token: cashier } = await createFinanceUser('Cashier');
    const { token: ops } = await createFinanceUser('Operations Manager');

    const inv = await createInvoice(finRequest('/invoices', { method: 'POST', token: auditor, body: invoiceBody() }));
    expect(inv.status).toBe(403);
    expect(await inv.json()).toEqual({ error: 'You do not have permission to perform this action.' });

    expect((await listUsers(finRequest('/users', { token: cashier }))).status).toBe(403);
    const lock = await lockPeriod(
      finRequest(`/periods/${periodIdOf(thisMonthDate())}/lock`, { method: 'POST', token: ops }),
      ctxParams({ id: periodIdOf(thisMonthDate()) }),
    );
    expect(lock.status).toBe(403);

    // The cashier can do their own job.
    expect((await createInvoice(finRequest('/invoices', { method: 'POST', token: cashier, body: invoiceBody() }))).status).toBe(201);
  });

  it('adds a custom role’s permissions to the built-in role', async () => {
    const { token: admin } = await createFinanceUser('Super Admin');
    const roleRes = await createCustomRole(
      finRequest('/custom-roles', { method: 'POST', token: admin, body: { name: 'Desk Billing', permissions: ['invoices:create'] } }),
    );
    expect(roleRes.status).toBe(201);
    const role = await roleRes.json();

    const { token: auditor } = await createFinanceUser('Auditor', { customRoleId: role.id });
    const res = await createInvoice(finRequest('/invoices', { method: 'POST', token: auditor, body: invoiceBody() }));
    expect(res.status).toBe(201);
  });

  it('lets only a Super Admin create staff logins and reset passwords', async () => {
    const { token: admin } = await createFinanceUser('Super Admin');
    const { token: cfo } = await createFinanceUser('CFO');

    const denied = await createUser(
      finRequest('/users', { method: 'POST', token: cfo, body: { username: 'x1', name: 'X', password: 'Secret123!' } }),
    );
    expect(denied.status).toBe(403);

    const short = await createUser(
      finRequest('/users', { method: 'POST', token: admin, body: { username: 'laila', name: 'Laila', role: 'CFO', password: 'short' } }),
    );
    expect(short.status).toBe(400);

    const created = await createUser(
      finRequest('/users', { method: 'POST', token: admin, body: { username: 'laila', name: 'Laila', role: 'CFO', password: 'FirstPass123' } }),
    );
    expect(created.status).toBe(201);
    const laila = await created.json();
    expect(laila.passwordHash).toBeUndefined();

    const first = await (await login(finRequest('/auth/login', { method: 'POST', body: { username: 'laila', password: 'FirstPass123' } }))).json();
    expect(first.token).toBeTruthy();

    const reset = await updateUser(
      finRequest(`/users/${laila.id}`, { method: 'PUT', token: admin, body: { password: 'SecondPass456' } }),
      ctxParams({ id: laila.id }),
    );
    expect(reset.status).toBe(200);

    // The reset signs out existing sessions and retires the old password.
    expect((await getState(finRequest('/state', { token: first.token }))).status).toBe(401);
    expect((await login(finRequest('/auth/login', { method: 'POST', body: { username: 'laila', password: 'FirstPass123' } }))).status).toBe(401);
    expect((await login(finRequest('/auth/login', { method: 'POST', body: { username: 'laila', password: 'SecondPass456' } }))).status).toBe(200);
  });

  it('never demotes or deactivates the last active Super Admin', async () => {
    const { user, token } = await createFinanceUser('Super Admin');
    const res = await updateUser(
      finRequest(`/users/${user._id}`, { method: 'PUT', token, body: { role: 'Accountant' } }),
      ctxParams({ id: user._id }),
    );
    expect(res.status).toBe(400);
  });

  it('trims /state to what the caller may see', async () => {
    await createFinanceUser('Super Admin');
    const { user: cashier, token } = await createFinanceUser('Cashier');
    const res = await getState(finRequest('/state', { token }));
    expect(res.status).toBe(200);
    const state = await res.json();
    expect(state.users.map((u: { id: string }) => u.id)).toEqual([cashier._id]);
    expect(state.auditLogs).toEqual([]);
    expect(state.accounts.length).toBeGreaterThan(50);
    expect(state.settings.paymentMethods.length).toBe(5);
  });
});
