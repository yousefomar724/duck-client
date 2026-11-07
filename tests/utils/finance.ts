import bcrypt from 'bcryptjs';
import type { UserRole } from '@/lib/finance/erp-types';
import { getFinanceModels } from '@/server/finance/models';
import { signFinanceToken } from '@/server/finance/auth/jwt';
import { seedReferenceData } from '@/server/finance/services/seed';
import { jsonRequest } from './http';

export const fin = () => getFinanceModels();

/**
 * Collections are wiped after every test, so re-seed reference data (and
 * forget the per-process "already seeded" memo) before each finance test.
 */
export async function seedFinance() {
  global._financeSeed = undefined;
  await Promise.all(Object.values(fin()).map((m) => m.init()));
  await seedReferenceData();
  global._financeSeed = Promise.resolve();
}

let seq = 0;

export async function createFinanceUser(
  role: UserRole = 'Super Admin',
  overrides: { username?: string; password?: string; customRoleId?: string; active?: boolean } = {},
) {
  seq += 1;
  const password = overrides.password ?? 'FinancePass123!';
  const user = await fin().User.create({
    username: overrides.username ?? `staff${seq}_${Date.now()}`,
    name: `${role} ${seq}`,
    email: '',
    role,
    customRoleId: overrides.customRoleId,
    active: overrides.active ?? true,
    passwordHash: await bcrypt.hash(password, 4),
    tokenVersion: 0,
  });
  return { user, password, token: signFinanceToken(user._id, 0) };
}

const BASE = 'http://localhost/api/v1/finance';

export function finRequest(path: string, options: { method?: string; body?: unknown; token?: string; headers?: Record<string, string> } = {}) {
  return jsonRequest(`${BASE}${path}`, options);
}

export const ctxParams = <P extends Record<string, string>>(params: P) => ({ params: Promise.resolve(params) });

/** A posting date in the current month, so it lands in a seeded Open period. */
export const thisMonthDate = (day = 10) => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const periodIdOf = (date: string) => `p-${date.slice(0, 7)}`;

export function invoiceBody(overrides: Record<string, unknown> = {}) {
  return {
    date: thisMonthDate(),
    customerName: 'Test Guest',
    status: 'issued',
    paymentMethod: 'Cash on Hand',
    paidAmount: 0,
    lines: [
      {
        tourType: 'Nile Kayak',
        service: 'Single Kayak',
        pax: 2,
        unitPrice: 500,
        discount: 0,
        revenueAccountCode: '4110',
        costCenter: 'CC-ELPH',
        activity: 'Kayak',
        location: 'Elephantine',
      },
    ],
    ...overrides,
  };
}
