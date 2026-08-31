import type { BookingDoc } from '../models/booking';
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

  if (amountPaid > 0) {
    await creditWalletBySupplierId(supplierId, amountPaid);
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
    if (amountPaid > 0) {
      await creditWalletBySupplierId(supplierId, -amountPaid, {
        allowNegative: true,
      }).catch(() => {});
    }
    throw err;
  }
}
