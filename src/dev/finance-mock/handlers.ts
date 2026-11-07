/**
 * Dev-only mock of the finance API (`/api/v1/finance/*`) for MSW.
 *
 * Exists so the /finance UI can be exercised before (or without) the real
 * Mongo-backed route handlers. Never imported in production builds — see
 * MockGate. State is in memory and resets on reload.
 *
 * Contract assumptions mirrored here:
 *   POST /auth/login  {username, password} -> {token, user}
 *   GET  /auth/me     -> {user}
 *   everything else   -> 401 {error} without `Authorization: Bearer <token>`
 *   POST /users, PUT /users/:id (role / password) -> the user record
 */
import { http, HttpResponse } from 'msw';
import type { User } from '@/components/finance/types/erp';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ASSET_CATEGORIES,
  DEFAULT_AUDIT_LOGS,
  DEFAULT_COST_CENTERS,
  DEFAULT_CUSTOMERS,
  DEFAULT_EXPENSES,
  DEFAULT_EXPENSE_MAPPINGS,
  DEFAULT_FIXED_ASSETS,
  DEFAULT_INVOICES,
  DEFAULT_JOURNAL_ENTRIES,
  DEFAULT_OPENING_BALANCES,
  DEFAULT_PERIODS,
  DEFAULT_RECEIPTS,
  DEFAULT_SETTINGS,
  DEFAULT_SUPPLIERS,
  DEFAULT_USERS,
} from './defaultData';

const BASE = '/api/v1/finance';
/** Every seeded mock user signs in with this password. */
export const MOCK_PASSWORD = 'duck-demo';

const users: User[] = DEFAULT_USERS.map((u) => ({ ...u }));
const passwords = new Map<string, string>(users.map((u) => [u.id, MOCK_PASSWORD]));

const tokenFor = (user: User) => `mock-finance-token.${user.id}`;
const userFromRequest = (request: Request): User | null => {
  const auth = request.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const id = auth.slice('Bearer '.length).split('.').slice(1).join('.');
  return users.find((u) => u.id === id) ?? null;
};
const unauthorized = () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
const forbidden = () => HttpResponse.json({ error: 'Forbidden' }, { status: 403 });

export const handlers = [
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const { username, password } = (await request.json()) as { username?: string; password?: string };
    const user = users.find((u) => u.username === username);
    if (!user || passwords.get(user.id) !== password) {
      return HttpResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
    return HttpResponse.json({ token: tokenFor(user), user });
  }),

  http.get(`${BASE}/auth/me`, ({ request }) => {
    const user = userFromRequest(request);
    return user ? HttpResponse.json({ user }) : unauthorized();
  }),

  http.get(`${BASE}/state`, ({ request }) => {
    if (!userFromRequest(request)) return unauthorized();
    return HttpResponse.json({
      users,
      accounts: DEFAULT_ACCOUNTS,
      customers: DEFAULT_CUSTOMERS,
      suppliers: DEFAULT_SUPPLIERS,
      invoices: DEFAULT_INVOICES,
      receipts: DEFAULT_RECEIPTS,
      expenses: DEFAULT_EXPENSES,
      journalEntries: DEFAULT_JOURNAL_ENTRIES,
      fixedAssets: DEFAULT_FIXED_ASSETS,
      costCenters: DEFAULT_COST_CENTERS,
      periods: DEFAULT_PERIODS,
      expenseMappings: DEFAULT_EXPENSE_MAPPINGS,
      purchaseInvoices: [],
      providerSettlements: [],
      auditLogs: DEFAULT_AUDIT_LOGS,
      settings: DEFAULT_SETTINGS,
      openingBalances: DEFAULT_OPENING_BALANCES,
      assetCategories: DEFAULT_ASSET_CATEGORIES,
      depreciationRuns: [],
    });
  }),

  http.post(`${BASE}/users`, async ({ request }) => {
    const me = userFromRequest(request);
    if (!me) return unauthorized();
    if (me.role !== 'Super Admin') return forbidden();
    const body = (await request.json()) as Partial<User> & { password?: string };
    if (!body.username || !body.password) {
      return HttpResponse.json({ error: 'username and password are required' }, { status: 400 });
    }
    if (users.some((u) => u.username === body.username)) {
      return HttpResponse.json({ error: 'Username already exists' }, { status: 400 });
    }
    const created: User = {
      id: `u-${Date.now()}`,
      username: body.username,
      name: body.name || body.username,
      email: body.email || '',
      role: body.role ?? 'Accountant',
      active: true,
    };
    users.push(created);
    passwords.set(created.id, body.password);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${BASE}/users/:id`, async ({ request, params }) => {
    const me = userFromRequest(request);
    if (!me) return unauthorized();
    if (me.role !== 'Super Admin') return forbidden();
    const user = users.find((u) => u.id === params.id);
    if (!user) return HttpResponse.json({ error: 'User not found' }, { status: 404 });
    const { password, ...rest } = (await request.json()) as Partial<User> & { password?: string };
    Object.assign(user, rest);
    if (password) passwords.set(user.id, password);
    return HttpResponse.json(user);
  }),

  // Anything else the screens call that this mock does not cover.
  http.all(`${BASE}/*`, ({ request }) => {
    if (!userFromRequest(request)) return unauthorized();
    return HttpResponse.json({ error: 'Not mocked in dev' }, { status: 404 });
  }),
];
