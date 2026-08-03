import { Wallet } from '../models/wallet';

/**
 * Go's `WalletService.UpdateBalance(userID, amount)` looked up the wallet by
 * `user_id`, but every call site (booking confirm/refund, payout status
 * change) actually passed a *supplier* ID — crediting/debiting the wrong
 * wallet (bug fix #2). This looks up by `supplier_id`, which is what those
 * call sites need. The unused Go `FindBySupplierID` repo method was the
 * evident original intent.
 */
export async function creditWalletBySupplierId(supplierId: string, amount: number): Promise<void> {
  const wallet = await Wallet.findOne({ supplier_id: supplierId });
  if (!wallet) throw new Error('wallet not found');
  wallet.amount += amount;
  if (wallet.amount < 0) throw new Error('insufficient funds');
  await wallet.save();
}

/** Used by the direct `PATCH /wallet/:user_id/:amount` admin endpoint — correct by user_id in the Go API, unchanged. */
export async function creditWalletByUserId(userId: string, amount: number): Promise<void> {
  const wallet = await Wallet.findOne({ user_id: userId });
  if (!wallet) throw new Error('wallet not found');
  wallet.amount += amount;
  if (wallet.amount < 0) throw new Error('insufficient funds');
  await wallet.save();
}
