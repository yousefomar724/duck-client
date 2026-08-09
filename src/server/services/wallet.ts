import { Wallet } from '../models/wallet';

export interface CreditWalletOptions {
  /** When false (default for payouts), reject if balance would go negative. */
  allowNegative?: boolean;
}

/**
 * Go's `WalletService.UpdateBalance(userID, amount)` looked up the wallet by
 * `user_id`, but every call site (booking confirm/refund, payout status
 * change) actually passed a *supplier* ID — crediting/debiting the wrong
 * wallet (bug fix #2). This looks up by `supplier_id`, which is what those
 * call sites need. The unused Go `FindBySupplierID` repo method was the
 * evident original intent.
 */
export async function creditWalletBySupplierId(
  supplierId: string,
  amount: number,
  options: CreditWalletOptions = {},
): Promise<void> {
  const { allowNegative = false } = options;

  if (amount === 0) return;

  if (allowNegative) {
    const result = await Wallet.findOneAndUpdate(
      { supplier_id: supplierId },
      { $inc: { amount } },
      { new: true },
    );
    if (!result) throw new Error('wallet not found');
    return;
  }

  const wallet = await Wallet.findOne({ supplier_id: supplierId });
  if (!wallet) throw new Error('wallet not found');

  const next = wallet.amount + amount;
  if (next < 0) throw new Error('insufficient funds');

  const updated = await Wallet.findOneAndUpdate(
    { supplier_id: supplierId, amount: wallet.amount },
    { $set: { amount: next } },
    { new: true },
  );
  if (!updated) {
    throw new Error('wallet update conflict — retry');
  }
}

/** Used by the direct `PATCH /wallet/:user_id/:amount` admin endpoint — correct by user_id in the Go API, unchanged. */
export async function creditWalletByUserId(
  userId: string,
  amount: number,
  options: CreditWalletOptions = {},
): Promise<void> {
  const { allowNegative = false } = options;

  if (amount === 0) return;

  if (allowNegative) {
    const result = await Wallet.findOneAndUpdate(
      { user_id: userId },
      { $inc: { amount } },
      { new: true },
    );
    if (!result) throw new Error('wallet not found');
    return;
  }

  const wallet = await Wallet.findOne({ user_id: userId });
  if (!wallet) throw new Error('wallet not found');

  const next = wallet.amount + amount;
  if (next < 0) throw new Error('insufficient funds');

  const updated = await Wallet.findOneAndUpdate(
    { user_id: userId, amount: wallet.amount },
    { $set: { amount: next } },
    { new: true },
  );
  if (!updated) {
    throw new Error('wallet update conflict — retry');
  }
}
