# Duck Aswan bookings → finance ERP

Duck is the source of truth for bookings, trips and prices, customers and payments. The ERP mirrors
them and owns the accounting. Only bookings of the **Duck Aswan** supplier reach the ERP. Every other
supplier's bookings stay out entirely.

| What | Where |
| --- | --- |
| Mapping (pure: booking → invoice lines, revenue target, cash entries) | `src/server/finance/sync/mapping.ts` |
| Booking sync (one transaction per booking) | `src/server/finance/sync/booking-sync.ts` |
| Trips mirror | `src/server/finance/sync/trip-sync.ts` |
| Outbox writes (model hooks) | `src/server/finance/sync/outbox.ts`, hooks in `src/server/models/booking.ts` and `trip.ts`, `releaseEndedBookings` |
| Outbox processing, reconcile, backfill pages | `src/server/finance/sync/runner.ts` |
| Cron + backfill endpoint | `src/app/api/v1/cron/finance-sync/route.ts` (daily, `vercel.json`) |
| Backfill CLI | `scripts/finance-backfill-bookings.mjs` (`pnpm finance:backfill-bookings`) |
| Collections | `fin_duck_links` (booking ↔ ERP documents), `fin_sync_outbox` |
| Tests | `tests/api/finance-sync.test.ts`, `tests/unit/server/finance-sync-mapping.test.ts` |

## Configuration

| Variable | Meaning |
| --- | --- |
| `FINANCE_DUCK_SUPPLIER_ID` | Duck Aswan's supplier id: `6a70a7defacf2773a551ba0c` in production. **Unset or malformed: the sync is off.** Nothing is queued, the cron answers `{enabled:false}` and the backfill refuses to run. |
| `FINANCE_DUCK_MANUAL_ACCOUNT` | Account MANUAL payments are received into. Default **1111** (Main Cash on Hand). See the assumptions below. |
| `FINANCE_SYNC_FROM` | Optional go-live floor (activity date). The backfill's `--from` is recorded in `fin_meta` and wins. |
| `FINANCE_SYNC_INLINE` | `0` skips the inline sync after each Duck write; the cron still runs. |
| `CRON_SECRET` | Guards `/api/v1/cron/finance-sync` (GET and POST), as for `release-bookings`. |

## Flow and reliability

1. **Outbox.** A `post('save')` / `post('deleteOne')` hook on Duck's `Booking` model (and `post('save')` on
   `Trip`) queues the id in `fin_sync_outbox` when the supplier is Duck Aswan. That covers every write path:
   checkout and walk-in creation (`booking.ts`), manual confirm and refund (`booking-payment.ts`), edits,
   cancels and deletes (`booking-edit.ts`), status changes (`booking-status.ts`), the manual booking route,
   collect-balance, refund-sent and customer cancel. `releaseEndedBookings` (the release cron and the ops
   reads) uses `updateMany`, which skips hooks, so it queues the Duck Aswan ids itself. This repo has no
   Kashier callback or webhook; a future one is covered by the save hook as long as it saves the booking.
2. **Never in Duck's way.** The hook returns at once and never throws. The outbox row is written after the
   response (`after()` from `next/server`), or detached outside a request. A finance failure cannot fail or
   slow a Duck write. If the row is lost (the function froze), the cron's reconcile pass finds the booking.
3. **Inline.** After writing the row, the same `after()` callback processes it (best effort).
4. **Cron** (`GET /api/v1/cron/finance-sync`, daily 03:30 UTC after `release-bookings`): mirrors every
   Duck Aswan trip, queues every Duck Aswan booking written since the last pass (one hour of overlap) and
   every linked booking that no longer exists, then runs the due outbox rows. The first pass looks back
   two days when no go-live date is set, so it never imports the whole history. A failed row backs off
   (2, 4, 8 … minutes, at most 6 hours), so the daily run always retries it.
5. **Idempotent.** The sync is state based. For each booking it computes what the ERP should hold and
   compares it with what `fin_duck_links` says was posted: the active invoice and its signature (date +
   lines), one receipt per payment entry key, refunds. It posts only the difference, in one MongoDB
   transaction with the link update. A replay posts nothing. The link row is written first, so two
   concurrent syncs of one booking conflict and one retries after the other commits.
6. **Audit log.** Each sync that posted something or saw a status change writes `DUCK_SYNC` (entity
   `Booking`, the ERP booking number) listing the documents. A failure writes `DUCK_SYNC_FAILED` once per
   distinct error. Trip mirror changes write `DUCK_SYNC_TRIP`. The documents' own `CREATE_INVOICE`,
   `CREATE_RECEIPT`, `CREATE_JOURNAL` and `REVERSE_JOURNAL` entries appear as usual, by "Duck Sync".

## Mapping rules

**Scope.**
- A booking enters the ERP when it is first seen in a sold state: CONFIRMED, PAID, SUCCESS, ARRIVED,
  IN_PROGRESS or COMPLETED. NO_SHOW, REFUND_PENDING, REFUNDED and REFUND_FAILED imply it was sold, as does
  CANCELLED with money recorded.
- PENDING and FAILED bookings, and CANCELLED ones with no payments, are never mirrored. That includes the
  ERP booking record, so abandoned checkouts stay out.
- Bookings whose activity date is before the go-live date are skipped unless already linked.
- Non-EGP bookings fail the sync with a clear error (the ERP books EGP only; no exchange rate is invented).

**Trips mirror.**
- Upserted into the ERP trips catalog by `websiteTripId` = Duck trip id, with `duckSynced: true`.
- Mapped fields:
  - `price` → `egyptianPrice` and `foreigner_price` → `foreignerPrice`. A price change is added to the
    trip's price audit trail.
  - Name, Arabic name and destination names.
  - Activity: the trip's single listed activity, else "Private Boat / Felucca" when the name says
    boat/felucca, else "Group / Extras".
  - Duration, minimum and maximum guests.
  - Status: inactive or deleted → Inactive, coming-soon → Draft, deleted → Hidden.
- On a mirrored trip the server rejects price changes, scheduled price changes and delete (400).
  `TripsCatalogView` disables those controls. Other fields stay editable.

**Customer.** Found by phone, else created (name, phone). Its running totals are recomputed from its
invoices, receipts and refunds after each sync.

**ERP booking.** One per Duck booking, `websiteRef` = Duck booking id, `duckSynced: true`, number from the
`BKG` counter.
- Status:
  - Invoiced while an invoice is active.
  - Cancelled once void.
  - Confirmed or Completed when zero-value.
- Paid and balance come from Duck, and the notes carry the Duck status and any refund owed.
- The server rejects updates and "convert to invoice" on it. `BookingsView` hides "New Trip Booking"
  (bookings are created in Duck admin) and shows "Synced from Duck" instead of "Create Invoice".

**Invoice** (Duck is the principal; tax 0).
- Dated on the **activity date** (Cairo), as the ERP's own booking → invoice does, so revenue lands in the
  month the trip runs.
- Lines follow Duck's pricing engine (`computeBookingAmount` in `src/server/services/booking.ts`):
  - Local guests × the local price and foreign guests × the foreign price, both from `pricing_snapshot`,
    each × the hours (`duration`) on a tour.
  - Kids pay the guest price: Duck has no kids price.
  - A booking with no local/foreign split is one line: quantity × price.
  - A guide line (`guide_price`, account 4150) when `wants_guide` or the trip's guide is mandatory.
  - Revenue account by activity: the booking's `resource_type` when set (kayak 4110, sup 4120,
    water_cycle 4130), else the trip's activity (as above).
- If the lines don't add up to the booking's list price (`subtotal`, or `amount` on old bookings), the
  difference is a "Price adjustment" line (or a discount), so the gross equals the subtotal. This covers an
  admin `amount_override`, a locked price, or a trip whose price changed. The tests check gross =
  `booking.subtotal` for kids, tours, guides and mixed groups.
- **Discounts net against revenue:** the discount code (`subtotal − amount`) is taken off the lines in
  order. So the invoice total = `booking.amount`, and the journal is Dr 1121 / Cr 41xx at the net amount.
- **Zero-value bookings** (a 100% code) post nothing: a journal must be above zero. The link records
  `zeroValue`.

**Payments → receipts.**
- Each payment entry with a positive amount is one ERP receipt (Dr cash/bank / Cr 1121), dated on its
  `recorded_at` (Cairo).
  - Its key `pe:<recorded_at ms>:<amount>:<n>` is stored in the link, so it is posted once.
  - KASHIER bookings receive into **1115** (Payment Gateway Clearing). MANUAL bookings receive into
    `FINANCE_DUCK_MANUAL_ACCOUNT` (default 1111).
- Edit bookkeeping entries (notes starting `edit refund owed`) are not cash and are skipped. Negative
  entries are refunds (below).
- When Duck holds more than its itemised entries (`amount_paid` above the receipts, e.g. a Kashier
  payment or an old booking without entries), the difference is one adjustment receipt (`adj:<n>`).
- A receipt is applied to the active invoice when it fits its open balance. Otherwise it is a payment on
  the customer's account (still Cr 1121). That happens to a deposit taken while the invoice is reversed,
  or to an overpayment after a downward edit.
- Afterwards the active invoice's paid/balance/status are set from the money Duck holds.
- The ERP refuses manual receipts against a Duck-synced invoice: payments are recorded in Duck.

**Changes use the ERP's reversal mechanism.** Posted documents are never edited in place.

| Duck event | ERP result |
| --- | --- |
| **Edit** (guests, trip, hours, guide, date, discount code, admin override), up or down | The active invoice's journal is reversed (`REV-JV-INV-…`), the invoice is marked `cancelled`, and a new invoice is issued for the new lines. Money already received is carried onto it. The reversal is dated the later of the invoice date and the change date. |
| **Downward edit after payment** (`refund_owed > 0`) | Re-invoice as above. The receipts stay, so receivable (1121) shows a credit: what is owed back to the customer. |
| **Refund sent** (`refund-sent`: `amount_paid` drops) | A refund journal `JV-RFD-YYYY-NNNN`: Dr 1121 / Cr the payment account, for the drop. |
| **Cancel before payment** (CANCELLED) | The invoice journal is reversed and the invoice `cancelled`. Revenue 0. |
| **Cancel after payment** (REFUND_PENDING, REFUND_FAILED) | Invoice reversed and `cancelled`. Receipts stay: the money is held and owed (1121 credit). |
| **Refunded** (REFUNDED) | Invoice reversed and marked `refunded`. Refund journal for the money given back. |
| **No-show** (NO_SHOW) | Revenue becomes the money kept (`amount_paid − refund_owed`, at most the total). The invoice is re-issued with the unpaid part as a "No-show: unpaid balance waived" discount. Fully paid no-shows are unchanged. |
| **Completed / arrived / in progress** | No accounting change (same lines). The ERP booking status is refreshed. |
| **Hard delete in Duck admin** | Invoice reversed. Receipts and refunds are left alone and flagged in the audit log for the accountant (the admin delete also reverses the supplier wallet, so cash may need a manual journal). |
| **Soft delete** | Treated like a delete. |
| **Reschedule** (date only) | Re-issued on the new activity date (reverse + new invoice). |

A posting into a Locked or Closed period fails (the ERP rule), and the row stays failed. It retries
daily, and the error shows in the audit log until the accountant reopens the period or the change is
handled by hand.

## Backfill

```bash
pnpm finance:backfill-bookings -- --from 2026-11-01 --dry-run --url https://www.duckegy.com
pnpm finance:backfill-bookings -- --from 2026-11-01 --url https://www.duckegy.com
```

- The script reads `CRON_SECRET` from `.env.local`. It posts pages of 100 bookings to the cron endpoint, so
  the deployment's `FINANCE_DUCK_SUPPLIER_ID` and mapping are used.
- The dry run maps the Duck Aswan bookings dated on or after `--from` and prints, per month: bookings,
  net revenue, money received and money held now. It writes nothing (not even the reference seed).
- A real run syncs each booking (idempotent: safe to re-run or to overlap with the live sync) and records
  `--from` as the go-live date. Failures are listed, queued in the outbox for the cron, and exit 2.
- Recommended order:
  1. Set `FINANCE_DUCK_SUPPLIER_ID` **and** `FINANCE_SYNC_FROM=<go-live>` in Vercel and deploy. With the
     floor set, a Duck write to an older booking never imports it.
  2. Run the dry run and check the monthly totals with the accountant.
  3. Enter opening balances for the books before go-live in the ERP.
  4. Run the backfill.
