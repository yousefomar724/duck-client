import { retainedAmount } from '@/lib/bookings/payment';
import type { BookingDoc } from '../models/booking';
import { releaseDiscount, undoReleaseDiscount, type DiscountRelease } from './discount';
import { creditWalletBySupplierId } from './wallet';

/**
 * Credits the supplier wallet, records the payment entry, and moves the booking
 * to CONFIRMED.
 *
 * Shared by the supplier's manual-confirm endpoint and walk-in creation so the
 * two paths cannot drift on money handling. A save failure reverses the credit,
 * so a partial write never leaves cash in a supplier's balance for a booking
 * that did not confirm.
 *
 * `amountPaid` of 0 is valid: staff can admit a walk-in now and collect later
 * via `collect-balance`. The booking still becomes CONFIRMED, so it counts
 * toward booked revenue and shows an outstanding balance.
 */
export async function confirmBookingPayment(
  booking: BookingDoc,
  amountPaid: number,
  note = '',
): Promise<void> {
  const supplierId = booking.supplier_id.toString();
  let customerCredit = 0;
  let platformCredit = 0;

  if (amountPaid > 0) {
    await creditWalletBySupplierId(supplierId, amountPaid);
    customerCredit = amountPaid;
  }

  if (
    booking.discount?.funded_by === 'platform' &&
    (booking.platform_discount_credited ?? 0) === 0 &&
    (booking.discount.amount ?? 0) > 0
  ) {
    platformCredit = booking.discount.amount;
    try {
      await creditWalletBySupplierId(supplierId, platformCredit);
    } catch (err) {
      if (customerCredit > 0) {
        await creditWalletBySupplierId(supplierId, -customerCredit, {
          allowNegative: true,
        }).catch(() => {});
      }
      throw err;
    }
    booking.platform_discount_credited = platformCredit;
  }

  booking.status = 'CONFIRMED';
  booking.amount_paid = amountPaid;
  if (amountPaid > 0) {
    booking.payment_entries.push({
      amount: amountPaid,
      recorded_at: new Date(),
      note,
    });
  }

  try {
    await booking.save();
  } catch (err) {
    if (customerCredit > 0) {
      await creditWalletBySupplierId(supplierId, -customerCredit, {
        allowNegative: true,
      }).catch(() => {});
    }
    if (platformCredit > 0) {
      await creditWalletBySupplierId(supplierId, -platformCredit, {
        allowNegative: true,
      }).catch(() => {});
      booking.platform_discount_credited = 0;
    }
    throw err;
  }
}

/**
 * Marks a booking refunded, returns the customer's money from the wallet, and
 * gives the discount use back. Platform-funded credit is reversed here too.
 */
export async function finalizeManualRefund(booking: BookingDoc, note: string): Promise<void> {
  const refundedAmount = retainedAmount(booking);
  const supplierId = booking.supplier_id.toString();
  if (refundedAmount > 0) {
    await creditWalletBySupplierId(supplierId, -refundedAmount, { allowNegative: true });
  }

  let release: DiscountRelease | null = null;
  try {
    release = await releaseDiscount(booking, 'refunded');
  } catch (err) {
    if (refundedAmount > 0) {
      await creditWalletBySupplierId(supplierId, refundedAmount, { allowNegative: true }).catch(() => {});
    }
    throw err;
  }

  booking.status = 'REFUNDED';
  booking.amount_paid = 0;
  booking.refund_owed = 0;
  if (refundedAmount > 0) {
    booking.payment_entries.push({
      amount: -refundedAmount,
      recorded_at: new Date(),
      note,
    });
  }

  try {
    await booking.save();
  } catch (err) {
    if (refundedAmount > 0) {
      await creditWalletBySupplierId(supplierId, refundedAmount, { allowNegative: true }).catch(() => {});
    }
    if (release) await undoReleaseDiscount(booking, release).catch(() => {});
    throw err;
  }
}
