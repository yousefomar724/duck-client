import type { BookingItem, Invoice, InvoiceLine } from '@/lib/finance/erp-types';
import type { BookingDoc } from '../models/settings';
import { logAudit } from './audit';
import { nextYearNumber } from './counters';
import { badRequest, notFound, so, type FinCtx } from './context';
import { createInvoice, getInvoice } from './invoices';
import { cleanUpdates, lineId, num, round2, toOut, toOutList, today, yearOf, ymd } from './util';

export async function getBookings(ctx: FinCtx): Promise<BookingItem[]> {
  const rows = await ctx.m.Booking.find().sort({ createdAt: -1, _id: -1 }).lean().session(ctx.session);
  return toOutList<BookingItem>(rows);
}

/** Prices come from the official catalog; foreigner pax on a pending-price trip need an approved price. */
export async function createBooking(ctx: FinCtx, data: Record<string, unknown>): Promise<BookingItem> {
  const trip = data.tripId ? await ctx.m.Trip.findById(String(data.tripId)).lean().session(ctx.session) : null;
  if (!trip) throw badRequest(`Trip with ID ${String(data.tripId ?? '')} not found in official catalog.`);

  const egyptianPax = Math.max(0, Math.trunc(num(data.egyptianPax)));
  const foreignerPax = Math.max(0, Math.trunc(num(data.foreignerPax)));
  if (egyptianPax + foreignerPax === 0) throw badRequest('A booking needs at least one guest.');
  const egyptianUnitPrice = trip.egyptianPrice;
  let foreignerUnitPrice = trip.foreignerPrice;
  if (foreignerPax > 0 && foreignerUnitPrice === null) {
    if (num(data.foreignerUnitPrice) > 0) foreignerUnitPrice = num(data.foreignerUnitPrice);
    else {
      throw badRequest(
        `Foreigner price is pending verification for trip '${trip.name}'. Authorized staff must specify the approved foreigner price.`,
      );
    }
  }

  const subtotal = round2(egyptianPax * egyptianUnitPrice + (foreignerPax > 0 && foreignerUnitPrice ? foreignerPax * foreignerUnitPrice : 0));
  const discountAmount = round2(Math.max(0, num(data.discountAmount)));
  const totalAmount = round2(Math.max(0, subtotal - discountAmount));
  const depositPaid = round2(Math.max(0, num(data.depositPaid)));
  if (depositPaid > totalAmount + 0.005) throw badRequest('The deposit cannot exceed the booking total.');
  const balanceDue = round2(Math.max(0, totalAmount - depositPaid));
  const nationalityCategory =
    egyptianPax > 0 && foreignerPax > 0 ? 'Mixed Group' : foreignerPax > 0 ? 'Foreigner' : 'Egyptian';
  const bookingDate = data.bookingDate ? ymd(data.bookingDate, 'bookingDate') : today();
  const bookingNumber = await nextYearNumber(ctx, 'BKG', yearOf(bookingDate));

  const [booking] = await ctx.m.Booking.create(
    [
      {
        bookingNumber,
        tripId: trip._id,
        tripName: trip.name,
        destination: trip.destination,
        activityType: trip.activityType,
        bookingDate,
        bookingTime: typeof data.bookingTime === 'string' && data.bookingTime ? data.bookingTime : '10:00 AM',
        customerName: typeof data.customerName === 'string' && data.customerName ? data.customerName : 'Nile Guest',
        customerPhone: typeof data.customerPhone === 'string' ? data.customerPhone : '',
        nationalityCategory,
        egyptianPax,
        foreignerPax,
        egyptianUnitPrice,
        foreignerUnitPrice: foreignerUnitPrice || 0,
        foreignerPricePendingOverride: trip.isForeignerPricePending,
        subtotal,
        discountAmount,
        discountReason: typeof data.discountReason === 'string' ? data.discountReason : '',
        totalAmount,
        depositPaid,
        balanceDue,
        status: 'Confirmed',
        notes: typeof data.notes === 'string' ? data.notes : '',
        // No invented reference: the ERP filled in a random WEB-BKG-#### here.
        websiteRef: typeof data.websiteRef === 'string' && data.websiteRef ? data.websiteRef : undefined,
      },
    ],
    so(ctx),
  );
  await logAudit(
    ctx,
    'CREATE_BOOKING',
    'Booking',
    bookingNumber,
    `Created booking ${bookingNumber} for ${booking.customerName} (${nationalityCategory}: ${egyptianPax} Egp / ${foreignerPax} For, Total: ${totalAmount} EGP)`,
  );
  return toOut<BookingItem>(booking);
}

export async function updateBooking(ctx: FinCtx, id: string, updates: unknown): Promise<BookingItem> {
  const booking = await ctx.m.Booking.findById(id).session(ctx.session);
  if (!booking) throw notFound(`Booking ${id} not found.`);
  // The number and the invoice link are owned by the server.
  booking.set(cleanUpdates<BookingDoc>(updates, ['bookingNumber', 'invoiceId', 'invoiceNumber']));
  await booking.save(so(ctx));
  await logAudit(ctx, 'UPDATE_BOOKING', 'Booking', booking.bookingNumber, `Updated booking ${booking.bookingNumber}`);
  return toOut<BookingItem>(booking);
}

/** Issues the booking's invoice (and its journal) and links the two, in one transaction. */
export async function convertBookingToInvoice(ctx: FinCtx, bookingId: string): Promise<Invoice> {
  const booking = await ctx.m.Booking.findById(bookingId).session(ctx.session);
  if (!booking) throw notFound(`Booking ${bookingId} not found.`);
  if (booking.invoiceId) return getInvoice(ctx, booking.invoiceId);
  if (booking.status === 'Cancelled') throw badRequest('A cancelled booking cannot be invoiced.');

  const costCenter = booking.destination.includes('Soheil') ? 'CC-SOHL' : 'CC-ELPH';
  const line = (kind: 'eg' | 'for', pax: number, unitPrice: number, label: string): InvoiceLine => ({
    id: lineId(`ln-${kind}`, 0),
    tourType: booking.tripName,
    service: `${booking.activityType} - ${label} Guest`,
    pax,
    unitPrice,
    grossAmount: round2(pax * unitPrice),
    discount: 0,
    netAmount: round2(pax * unitPrice),
    captain: '',
    notes: `${label} Guests (${pax} pax) - Ref: ${booking.bookingNumber}`,
    revenueAccountCode: '4110',
    costCenter,
    activity: booking.activityType,
    location: booking.destination,
  });
  const lines: InvoiceLine[] = [];
  if (booking.egyptianPax > 0) lines.push(line('eg', booking.egyptianPax, booking.egyptianUnitPrice, 'Egyptian'));
  if (booking.foreignerPax > 0) lines.push(line('for', booking.foreignerPax, booking.foreignerUnitPrice, 'Foreigner'));
  if (lines.length > 0 && booking.discountAmount > 0) {
    lines[0].discount = round2(lines[0].discount + booking.discountAmount);
    lines[0].netAmount = round2(lines[0].netAmount - booking.discountAmount);
  }

  const invoice = await createInvoice(ctx, {
    date: booking.bookingDate,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    bookingRef: booking.bookingNumber,
    paymentMethod: booking.depositPaid > 0 ? 'Cash on Hand' : 'Invoice Payment Pending',
    paidAmount: booking.depositPaid,
    lines,
    notes: `Generated from official booking ${booking.bookingNumber} (${booking.nationalityCategory}). Deposit received: ${booking.depositPaid} EGP. Outstanding balance: ${booking.balanceDue} EGP.`,
  });

  booking.status = 'Invoiced';
  booking.invoiceId = invoice.id;
  booking.invoiceNumber = invoice.invoiceNumber;
  await booking.save(so(ctx));
  await logAudit(
    ctx,
    'CONVERT_BOOKING_TO_INVOICE',
    'Booking',
    booking.bookingNumber,
    `Converted booking ${booking.bookingNumber} to invoice ${invoice.invoiceNumber}`,
  );
  return invoice;
}
