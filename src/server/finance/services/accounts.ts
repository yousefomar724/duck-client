import type { Account } from '@/lib/finance/erp-types';
import type { AccountDoc } from '../models/accounting';
import { logAudit } from './audit';
import { badRequest, notFound, so, type FinCtx } from './context';
import { cleanUpdates, round2, toOut } from './util';

/**
 * Journal statuses that count in the books. A reversed journal stays in the
 * ledger next to its reversal so the two net to zero; the ERP dropped the
 * original once reversed, which doubled every reversal's effect.
 */
export const LEDGER_STATUSES = ['posted', 'reversed'] as const;

type Totals = Record<string, { debit: number; credit: number }>;

/** Sum of debits and credits per account across every ledger journal. */
export async function accountTotals(ctx: FinCtx): Promise<Totals> {
  const rows = await ctx.m.JournalEntry.aggregate<{ _id: string; debit: number; credit: number }>([
    { $match: { status: { $in: [...LEDGER_STATUSES] } } },
    { $unwind: '$lines' },
    { $group: { _id: '$lines.accountCode', debit: { $sum: '$lines.debit' }, credit: { $sum: '$lines.credit' } } },
  ]).session(ctx.session);
  const totals: Totals = {};
  for (const r of rows) totals[r._id] = { debit: r.debit, credit: r.credit };
  return totals;
}

function withBalance(acc: AccountDoc | Record<string, unknown>, totals: Totals): Account {
  const out = toOut<Account>(acc);
  const t = totals[out.code] ?? { debit: 0, credit: 0 };
  out.balance = round2(out.normalBalance === 'Debit' ? t.debit - t.credit : t.credit - t.debit);
  return out;
}

/** Chart of accounts with balances derived from posted journals (never stored). */
export async function getAccounts(ctx: FinCtx): Promise<Account[]> {
  const [accounts, totals] = await Promise.all([
    ctx.m.Account.find().sort({ code: 1 }).lean().session(ctx.session),
    accountTotals(ctx),
  ]);
  return accounts.map((a) => withBalance(a, totals));
}

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

export async function createAccount(ctx: FinCtx, data: Record<string, unknown>): Promise<Account> {
  const code = String(data.code ?? '').trim();
  if (!code) throw badRequest('Account code is required.');
  if (!data.nameEn && !data.nameAr) throw badRequest('Account name is required.');
  if (!ACCOUNT_TYPES.includes(String(data.type))) throw badRequest('Account type is invalid.');
  if (data.normalBalance !== 'Debit' && data.normalBalance !== 'Credit') {
    throw badRequest('Normal balance must be Debit or Credit.');
  }
  if (await ctx.m.Account.exists({ code }).session(ctx.session)) {
    throw badRequest(`Account code ${code} already exists.`);
  }
  const parentCode = data.parentCode ? String(data.parentCode) : undefined;
  if (parentCode) {
    const parent = await ctx.m.Account.findOne({ code: parentCode }).session(ctx.session);
    if (!parent) throw badRequest(`Parent account ${parentCode} does not exist.`);
    parent.isPosting = false; // A parent with children cannot be posted to.
    await parent.save(so(ctx));
  }
  const [acc] = await ctx.m.Account.create(
    [
      {
        code,
        nameAr: String(data.nameAr ?? data.nameEn),
        nameEn: String(data.nameEn ?? data.nameAr),
        type: data.type,
        parentCode,
        normalBalance: data.normalBalance,
        isPosting: data.isPosting !== false,
        currency: String(data.currency ?? 'EGP'),
        active: data.active !== false,
        description: data.description ? String(data.description) : undefined,
      },
    ],
    so(ctx),
  );
  await logAudit(ctx, 'CREATE_ACCOUNT', 'Account', code, `Created account ${code} - ${acc.nameEn}`);
  return withBalance(acc, {});
}

export async function updateAccount(ctx: FinCtx, code: string, updates: unknown): Promise<Account> {
  const acc = await ctx.m.Account.findOne({ code }).session(ctx.session);
  if (!acc) throw notFound(`Account ${code} not found.`);
  // The code is the account's identity in every journal line; it cannot change.
  const patch = cleanUpdates<AccountDoc>(updates, ['code', 'balance']);
  acc.set(patch);
  await acc.save(so(ctx));
  await logAudit(ctx, 'UPDATE_ACCOUNT', 'Account', code, `Updated account ${code}`);
  return withBalance(acc, await accountTotals(ctx));
}
