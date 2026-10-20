# Discount Codes — Implementation Plan

Status: plan only, nothing implemented yet.

## 1. Decisions

Decided with the owner:

| Topic | Decision |
|---|---|
| Who pays for the discount | **The creator pays.** A supplier's code lowers that supplier's earnings. An admin (platform) code is paid by the platform, so the supplier is still credited the full price. |
| Who creates codes | **Suppliers**, for their own trips only. **Admin**, for any supplier, specific trips, or all trips on the platform. Admin can see and disable every code. |
| Code types | Percentage (1–100%, where 100% means free) or fixed amount. |
| Limits | Expiry date and time (required), optional start time, total usage cap, once per customer, specific trips only, minimum booking total, and a maximum discount for % codes. |
| 100% off (total = 0) | The booking is still created as `PENDING` and the supplier confirms it with 0 paid. The customer sees no InstaPay step. |

Defaults I chose. Change any of these before you start building:

- **One code per booking.** Codes don't stack.
- **The discount applies to the whole booking total**, including the guide fee.
- **Expiry is checked when the booking is made**, not on the trip date. A code that expires tomorrow can still be used for a trip next month.
- **"Customer" means the normalized phone number.** Guests can check out without logging in, so `user_id` isn't reliable. Someone who uses a different phone number can get around "once per customer". That's a known limitation.
- **Codes are case-insensitive and unique across the whole platform.** Customers type them without saying which supplier they're booking with.
- **A use is given back** when a booking ends as `CANCELLED`, `REFUNDED` or `FAILED`, or is deleted by admin. It is **kept** for `COMPLETED`, `NO_SHOW` and other bookings that actually happened.
- **The discount is frozen on the booking.** If the booking is edited later, the same rule (type, value, cap) is applied again to the new subtotal, even if the code has since expired or been disabled.
- **Customers can't add or remove a code after booking.** Admin can fix the price with the existing `amount_override`.
- **Rounding:** the discount is rounded **down** to a whole currency unit, so we never give away more than the stated amount.

## 2. Why this fits the current money flow

How it works today:

- The customer pays the single InstaPay account (`INSTAPAY_LINK`).
- The supplier confirms receipt (`manual-confirm` → `confirmBookingPayment`), which credits `amount_paid` to the **supplier's wallet**.
- Admin pays suppliers out through `Payout`, which takes the money out of the wallet.
- Refunds and edits take money out of the wallet (`refund`, `applyBookingEdit`, `deleteBookingByAdmin`).

The key design rule is that **`booking.amount` stays "what the customer owes"**. Everything that already works off `amount`, such as deposits (`minimumDeposit`), outstanding balance, payment state, the refund maths, `computeBookingStats` and the `ops.ts` revenue aggregations, keeps working with no changes. The discount is stored next to `amount`, not mixed into it.

Who pays then decides only one thing: whether the supplier's wallet also gets the discount on top of what the customer paid.

```
Supplier-funded code:   wallet += amount_paid
Platform-funded code:   wallet += amount_paid + platform_discount   (platform pays the supplier the difference)
```

Because payouts already pay out the wallet balance, platform-funded discounts reach the supplier automatically. No payout changes are needed beyond showing a breakdown.

## 3. Data model

### 3.1 New collection `DiscountCode` (`src/server/models/discount-code.ts`)

| Field | Type | Notes |
|---|---|---|
| `code` | string | Stored uppercase and trimmed. Allowed: `A–Z 0–9 -`, 4–32 chars. Unique among non-deleted codes (partial unique index on `deletedAt: null`). |
| `description` | string | Internal note, e.g. "Ramadan promo". |
| `type` | `'percentage' \| 'fixed'` | |
| `value` | number | % must be 1–100. Fixed must be > 0. |
| `currency` | string | Required for `fixed` (e.g. `EGP`). The booking's currency must match. |
| `max_discount` | number \| null | % codes only. Optional cap. |
| `min_booking_amount` | number \| null | Checked against the **subtotal** (before the discount). |
| `starts_at` | Date \| null | null = active right away. |
| `expires_at` | Date | Required. Picked in Cairo time in the UI and stored as UTC (use `siteWallTimeToUtc` from `src/lib/time.ts`). |
| `usage_limit_total` | number \| null | null = unlimited. |
| `once_per_customer` | boolean | |
| `used_count` | number | Active uses only. Increased and decreased with atomic conditional updates. |
| `supplier_id` | ObjectId \| null | null = platform-wide, which only admin can set. |
| `trip_ids` | ObjectId[] | Empty = every trip in scope. |
| `funded_by` | `'supplier' \| 'platform'` | Set from the creator's role and never accepted from the request body. |
| `created_by_user_id`, `created_by_role` | | For the audit trail. |
| `status` | `'active' \| 'disabled'` | |
| soft-delete plugin | | Use the same `softDeletePlugin` and `schemaOptions` as the other models. |

Indexes: `{ code: 1 }` unique (partial), `{ supplier_id: 1, status: 1 }`, `{ expires_at: 1 }`.

### 3.2 New collection `DiscountRedemption` (`src/server/models/discount-redemption.ts`)

One row per booking that used a code. This gives the audit trail, enforces "once per customer", and makes it safe to give a use back.

| Field | Notes |
|---|---|
| `code_id`, `booking_id`, `supplier_id` | |
| `customer_key` | Normalized E.164 phone from `phoneToE164` (`src/lib/booking/phone.ts`). |
| `user_id` | When logged in. |
| `discount_amount` | |
| `status` | `'active' \| 'released'` |
| `released_at`, `released_reason` | |

Indexes:

- `{ code_id: 1, customer_key: 1 }` **unique, partial on `status: 'active'` and `once_per_customer: true`**. Copy the flag onto the redemption so the database itself enforces "once per customer", even when two requests race.
- `{ booking_id: 1 }` unique.

### 3.3 New fields on `Booking` (`src/server/models/booking.ts`)

| Field | Notes |
|---|---|
| `subtotal` | Price before the discount. Default 0. Old bookings without it are read as `amount` (add a helper). |
| `discount` | Sub-document or null: `{ code_id, code, type, value, max_discount, funded_by, amount }`. This is the frozen snapshot, used when an edit reprices the booking. |
| `platform_discount_credited` | Number. How much platform money has gone into the supplier's wallet for this booking. Lets every reversal be exact and safe to run twice. |

No backfill migration is needed. All new fields default to empty, and old bookings behave exactly as they do today.

Add the same fields to the client `Booking` type in `src/lib/types`.

## 4. Pricing logic (one shared pure function)

New file `src/lib/booking/discount.ts`, imported by both the server and the `/book` page so they can't drift apart:

```
applyDiscount(subtotal, rule) -> { discount, total }
  percentage: d = floor(subtotal * value / 100); if max_discount: d = min(d, max_discount)
  fixed:      d = value
  d = min(d, subtotal)          // can never go below 0
  total = subtotal - d
```

Plus `checkCodeEligibility(code, ctx)`, which returns either ok or an error code:

`NOT_FOUND`, `DISABLED`, `NOT_STARTED`, `EXPIRED`, `WRONG_SUPPLIER`, `TRIP_NOT_ELIGIBLE`, `CURRENCY_MISMATCH`, `BELOW_MINIMUM`, `USAGE_LIMIT_REACHED`, `ALREADY_USED_BY_CUSTOMER`.

Deposit: `minimumDeposit(total)` runs on the **discounted total**. If the total is 0, `declared_amount = 0` and there's no payment step.

## 5. Server changes

### 5.1 Code management API

| Endpoint | Who | Notes |
|---|---|---|
| `GET /api/v1/discount-codes` | admin: all, filter by supplier/status/creator. Supplier: their own codes plus admin codes aimed at them (read-only). | Shows `used_count` and status: active, scheduled, expired or exhausted. |
| `POST /api/v1/discount-codes` | admin, supplier | Validate with zod (`zod/v3`, same as `bookings/manual`). For a supplier, `supplier_id` is **forced from the session**, every `trip_id` must belong to them, and `funded_by` is forced to `supplier`. |
| `PATCH /api/v1/discount-codes/[id]` | creator or admin | Once `used_count > 0`, **lock** `code`, `type`, `value`, `currency`, `supplier_id` and `trip_ids`. Expiry, limits, status and description can still change. `usage_limit_total` can't go below `used_count`. |
| `DELETE /api/v1/discount-codes/[id]` | creator or admin | Soft-delete if never used. Otherwise just disable it, since history must stay. |
| `GET /api/v1/discount-codes/[id]/redemptions` | creator or admin | The bookings that used it. |
| `POST /api/v1/discount-codes/validate` | public (optional auth) | Body: `code`, `trip_id`, phone, and the same pricing inputs as the booking. The **server** calculates the subtotal with `computeBookingAmount` and returns `{ subtotal, discount, total, min_deposit }` or an error code. Rate-limit it the way `src/app/api/v1/feedback/route.ts` does, so people can't guess codes by brute force. |

Supplier ownership checks follow the pattern in `manual-confirm`: load the user, then compare `supplier_id`.

### 5.2 Creating a booking (`src/server/services/booking.ts`, `bookings/manual/route.ts`)

1. Add an optional `discount_code` to `manualBookingSchema`. **Never accept an amount or discount from the client.**
2. In `buildBooking`: after `computeBookingAmount`, set `subtotal = amount`, load the code, run `checkCodeEligibility`, then `applyDiscount` → `amount = total`. Clamp `declared_amount` against the discounted total.
3. In `persistCreatedBooking`: create the booking → `verifyOccupancy` → **redeem**.
   - **Redeem** is one atomic `findOneAndUpdate` on the code, `{ _id, status:'active', deletedAt:null, expires_at > now, starts_at <= now, used_count < limit }` → `$inc used_count`, then insert a `DiscountRedemption`.
   - If the redemption insert fails (duplicate key = same phone used it already), decrease `used_count` again.
   - If any step fails, delete the booking and undo what was done before it. This is the same compensation pattern the codebase already uses, since there are no Mongo transactions.
4. Return `409` with the error code so the UI can show a clear message.
5. Walk-ins (`walk-in-sheet.tsx`) go through the same endpoint, so staff can enter a code too. It's an optional field.
6. The supplier's new-booking email (`mail.ts` `formatBookingEmailBody`, `toBookingEmailData`) shows subtotal, code, discount and total.

### 5.3 Confirming payment (`src/server/services/booking-payment.ts`, `manual-confirm/route.ts`)

`confirmBookingPayment` is the **only place that sets `CONFIRMED`**, which is good: the platform credit belongs here.

- If `discount.funded_by === 'platform'` and `platform_discount_credited === 0`: credit `discount.amount` to the wallet and record it. Reverse it if the save fails, the same way the existing credit is reversed.
- `manual-confirm` currently returns an error when `amountPaid <= 0`. **Allow 0 when `booking.amount === 0`** (the 100%-off case). Without this, free bookings can never be confirmed.
- Collecting the balance later (`collect-balance`) doesn't change, because it already works off `amount`.

### 5.4 Edits (`src/server/services/booking-edit.ts` `applyBookingEdit`)

- Run the pricing again → new **subtotal**, then apply `booking.discount` again from the snapshot. Don't re-check expiry, the minimum or the usage limit, because the use was already granted. A fixed discount is capped at the new subtotal.
- `amount = total`. The existing `refund_owed` and wallet-change logic then works unchanged.
- If platform-funded and already confirmed: change the wallet by `newDiscount - platform_discount_credited` and update the field. Include it in the revert block if the save fails.
- `amount_override` (admin): the override is the final total. Keep the discount snapshot for reporting and leave the platform credit unchanged.
- Add `subtotal` and `discount.amount` to the `before`/`after` lists so revisions show them.
- Switching trip: keep the discount (default above).

### 5.5 Cancel, refund and delete (release the use and reverse the platform credit)

Add one helper, `releaseDiscount(booking, reason)`, that is safe to call more than once. It marks the redemption `released`, decreases `used_count` (never below 0), and debits `platform_discount_credited` from the wallet, then sets it to 0. Call it from:

| Path | When |
|---|---|
| `cancelBookingByStaff` (supplier and admin cancel) | When the booking goes to `CANCELLED` (nothing paid). If it goes to `REFUND_PENDING`, call it when the refund completes instead. |
| `bookings/[id]/refund` and `manual-refund` | On `REFUNDED`. |
| customer `cancel` | Nothing happens at `REFUND_PENDING`; the release happens at refund. |
| `deleteBookingByAdmin` | Add `platform_discount_credited` to `walletExposure`, then release. |
| `FAILED` status changes | Release. |
| `NO_SHOW` and `COMPLETED` | **No release.** The supplier keeps the platform credit. |

Known gap to watch: **`PENDING` bookings that are never confirmed** keep holding a use, because nothing expires them today. Show "pending uses" in the code's usage view. Later, consider a cron that cancels stale `PENDING` bookings.

### 5.6 Finance helpers and reports

- `src/lib/bookings/payment.ts`: add `subtotalOf(booking)`, `discountAmount(booking)` and `supplierEarnings(booking) = retainedAmount + platform_discount_credited`.
- `src/lib/bookings/stats.ts` (`computeBookingStats`): add `discountsTotal`, `supplierFundedDiscounts` and `platformFundedDiscounts`.
- `src/server/services/ops.ts` (`getReportsOverview` and the other `$amount` aggregations): keep `revenue` as it is (what customers pay) and add `$sum` for `discount.amount` split by `funded_by`, plus `platform_discount_credited`.
  - **Supplier reports** show: Gross (subtotal) → Discounts (own / Duck) → Paid by customers → **Your earnings**.
  - **Admin reports** add a **"Platform discount cost"** line and a per-code performance table: uses, discount given, and revenue from those bookings.
- Admin payouts and supplier detail: show the wallet breakdown (customer payments plus platform discount credits) so the payout amount can be explained.

## 6. UI changes

### 6.1 Customer (`src/app/(landing)/book/page.tsx`)

- A "Have a discount code?" field with an **Apply** button that calls `/discount-codes/validate`. Run validation again when guests, trip, duration or guide change, since the total changes. If a change makes the code invalid (e.g. now below the minimum), remove it and say why.
- The price breakdown shows subtotal, code, discount and total. Deposit and full-amount buttons use the discounted total.
- **If the total is 0**, hide the InstaPay step and change the copy to "Free booking, waiting for confirmation".
- Show the discount on the success page (`booking-success-cache`, `booking/success`), in `my-bookings`, and in the pending InstaPay banner amount.
- Error messages for each error code, in **both `en` and `ar`** (`messages/`).

### 6.2 Supplier dashboard

- A new **Discount codes** page (`src/app/supplier/discount-codes`) linked from `supplier-sidebar.tsx` and `supplier/more`. Reuse the `data-table` components.
  - List: code, type/value, trips, expiry, uses / limit, status. Admin codes aimed at this supplier appear read-only with a "by Duck" label.
  - Create/edit form: type picker, value (with a "100% = free" hint), Cairo date-time picker (`date-time-picker.tsx`), limits and trip multi-select. Locked fields show as disabled once the code has been used.
  - A redemptions drawer listing the bookings that used the code.
- Booking detail sheet, cards and table (`components/dashboard/bookings/*`, `ops-booking-card.tsx`): a code badge and a subtotal / discount / total breakdown, plus "Covered by Duck: X" when the platform funds it.
- `booking-edit-dialog.tsx`: preview the new total with the discount applied again.
- Reports (`reports-view.tsx`): the discount lines from §5.6.

### 6.3 Admin dashboard

- **Discount codes** page (`src/app/admin/discount-codes`): all codes, filters (supplier, creator, status), create for any supplier or platform-wide, disable anything.
- Bookings: filter "has discount code" and filter by code.
- Reports: platform discount cost and per-code performance.
- Payouts and supplier detail: wallet breakdown.
- Strings go in `src/lib/dashboard/strings.ts` / `localize.ts`, in both languages.

### 6.4 Docs and agents

- Add `discount_code` to the public API docs (`(landing)/docs/api`) and to `llms-full.txt` if it lists booking fields. The MCP route has no booking-create tool, so it needs no change.

## 7. Build order (each phase ships with its tests)

1. **Core:** models, `discount.ts` pure functions, booking fields and types. Unit tests.
2. **Code management API:** CRUD, permissions, validate endpoint, rate limit. API tests.
3. **Checkout:** `buildBooking` / `persistCreatedBooking` redeem and compensate, and allow a 0 confirm. API tests, including the race test.
4. **Money paths:** confirm credit, edit repricing, release on cancel/refund/delete, wallet. API tests.
5. **Dashboards:** supplier and admin code pages, booking breakdowns, reports, payouts, emails, i18n. Component tests.
6. **Customer checkout UI:** `/book`, success, my-bookings. Component tests.
7. **E2E and full regression:** `pnpm test:all`, then the manual QA checklist (§9).

Phases 2 and 5–6 can be split up once phase 1 is merged. Phases 3 and 4 touch the same money code, so do them in order.

## 8. Test matrix

Use the existing setup: vitest projects `unit`, `api` (mongodb-memory-server) and `dom`, Playwright `e2e`, and factories in `tests/utils/factories.ts` (add `makeDiscountCode`).

### 8.1 Unit: `tests/unit/lib/discount.test.ts`

- % codes: 10% of 1000 = 100. 15% of 333 = 49 (rounded down). 100% = total 0.
- % with `max_discount`: the cap applies, and it doesn't apply when the discount is under the cap.
- Fixed: 200 off 1000 = 800. Fixed larger than the subtotal = total 0, never negative.
- The guide fee is included in the subtotal that gets discounted.
- Minimum booking total: exactly equal passes, 1 below fails.
- Eligibility at the exact boundaries: `now == expires_at` → EXPIRED. `now == starts_at` → ok. 1 ms before start → NOT_STARTED.
- Disabled or deleted, wrong supplier, trip not in the list, platform-wide code on any trip, currency mismatch.
- Code normalization: `" summer10 "` → `SUMMER10`. Invalid characters rejected.
- Deposit: `minimumDeposit` on the discounted total. Total 0 → deposit 0.
- `computeBookingStats` with mixed discounted and normal bookings, both funding types.
- `supplierEarnings`, `subtotalOf` for old bookings without `subtotal`.

### 8.2 API: code management (`tests/api/discount-codes.test.ts`)

- Supplier creates a code → `supplier_id` and `funded_by=supplier` are forced, even if the body says otherwise.
- Supplier tries another supplier's `trip_id` → 403/400.
- Supplier can't read, edit or delete another supplier's codes. Can read but not edit admin codes aimed at them.
- Customer or anonymous user can't use the CRUD endpoints → 401/403.
- Duplicate code, including a case-only difference → 409.
- `value` 0, 101, or negative → 400. % with `currency` is ignored. Fixed without `currency` → 400. `expires_at` in the past or before `starts_at` → 400.
- PATCH after use: locked fields rejected, expiry and limit changes allowed, limit below `used_count` rejected.
- DELETE: an unused code is soft-deleted, a used one is disabled.

### 8.3 API: checkout (`tests/api/booking-discount.test.ts`)

- Valid code → `subtotal`, `discount`, `amount` and `declared_amount` are correct. A redemption row exists and `used_count` is 1.
- The client sends a fake `amount` or discount → ignored.
- Each eligibility error → 4xx with its error code, **no booking created**, `used_count` unchanged.
- Booking fails after the redeem step (no capacity / `verifyOccupancy` fails) → booking deleted, use given back.
- **Race:** `usage_limit_total = 1`, two bookings at the same time (`Promise.all`) → exactly one succeeds, `used_count` = 1.
- **Race:** once per customer, same phone, two at the same time → exactly one succeeds.
- Once per customer: the same phone written differently (`010…`, `+2010…`, with spaces) is treated as the same customer. A different phone works.
- Cancelled booking → the same customer can use the code again, and `used_count` goes down.
- 100% code → `amount 0`, `declared_amount 0`, `PENDING`. Supplier confirms with 0 → `CONFIRMED`, wallet unchanged (supplier-funded).
- A booking with no code is exactly the same as today (snapshot-compare against the current behaviour).
- Walk-in with a code.
- Validate endpoint gives the same numbers as booking creation, and the rate limit kicks in.

### 8.4 API: money (`tests/api/booking-discount-finance.test.ts`)

For **both** `funded_by` values, check the wallet balance after each step:

- Confirm with the full amount: supplier-funded wallet = paid. Platform-funded wallet = paid + discount.
- Confirm with a deposit, then `collect-balance`.
- Platform-funded 100% code, confirmed with 0 → wallet = full subtotal (the platform pays it all).
- Edit up (more guests): the discount is applied again (correct % amount, fixed stays fixed), and platform credit changes match.
- Edit down below what was paid → `refund_owed` is correct, `refund-sent` works.
- Edit after the code expired or was disabled → the discount is still applied.
- Admin `amount_override` with a discounted booking.
- Customer cancel → `REFUND_PENDING` → admin refund: the wallet is debited the paid amount **and** the platform credit, the use is given back, and the platform credit field is 0.
- Supplier cancels a `PENDING` booking → `CANCELLED`, use given back, wallet unchanged.
- Admin hard delete of a confirmed platform-funded booking → `wallet_adjustment` includes the platform credit.
- `NO_SHOW` / `COMPLETED` → the use is kept and the credit is kept.
- Calling release twice → no double debit, and `used_count` never goes below 0.
- Payout after platform-funded bookings → the payout can take the full balance.
- Reports overview: discount totals split correctly per supplier and for admin.

### 8.5 Components (dom)

- `/book`: apply a valid code → breakdown updates. Invalid code → the localized error. Changing guests below the minimum → the code is removed with a message. Total 0 → the InstaPay step is hidden. Deposit buttons use the discounted total.
- Discount code form: rejects % over 100, past expiry, and fixed with no currency. Locked fields are disabled when `used_count > 0`.
- Booking detail sheet: breakdown and "Covered by Duck" label.
- Arabic RTL rendering of the new pieces.

### 8.6 E2E (Playwright)

1. Supplier creates a 20% code → the customer books with it → the supplier sees the discounted booking and confirms → the supplier report shows the discount.
2. Admin creates a platform 100% code → the customer gets a free booking (no InstaPay) → the supplier confirms → the admin sees the platform discount cost, and the supplier wallet/payout includes it.
3. An expired code shows an error and the booking goes ahead at full price.

## 9. Manual QA checklist before release

- [ ] Every code type × funding source × payment (full / deposit / free) on a real phone, in Arabic and English.
- [ ] A code created at 23:30 Cairo time expiring at 00:00 behaves correctly across midnight (UTC vs Cairo).
- [ ] Old bookings (from before this feature) still look and add up the same in every dashboard and report.
- [ ] The supplier's wallet balance matches the hand-calculated total after a full day of test bookings, cancels and refunds.
- [ ] Emails show the discount correctly.
- [ ] `pnpm test:all` passes.

## 10. Later (not in this version)

- An auto-expiry cron for stale `PENDING` bookings, so they stop holding uses.
- Generating many one-off codes in bulk (e.g. for the game's points → gifts reward).
- Customer-specific codes (only valid for one phone or user).
- Admin choosing `funded_by` per code (e.g. sharing the cost 50/50 with the supplier).
- Applying or removing a code on an existing booking from the dashboard.
