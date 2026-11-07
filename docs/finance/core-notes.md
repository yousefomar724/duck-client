# Finance core: data layer, API and auth

The owner's ERP backend (`server.ts` + `src/server/db.ts` in marsaegy1-beep/DUCK-) ported into
Duck: same MongoDB, same Vercel deploy, collections prefixed `fin_`.

| What | Where |
| --- | --- |
| Shared types (verbatim ERP `erp.ts`, plus auth fields) | `src/lib/finance/erp-types.ts` |
| Mongoose models (`fin_*` collections) | `src/server/finance/models/` |
| Services (every `db.ts` method) | `src/server/finance/services/` |
| Auth: JWT, guard, permissions | `src/server/finance/auth/` |
| Route wrapper (auth → permission → transaction → `{error}`) | `src/server/finance/http.ts` |
| Route handlers | `src/app/api/v1/finance/**/route.ts` |
| First-admin script | `scripts/finance-create-admin.mjs` |
| Tests | `tests/api/finance-auth.test.ts`, `tests/api/finance-ledger.test.ts` |
| Duck Aswan booking sync (outbox, mapping, cron, backfill) | `src/server/finance/sync/`, see `docs/finance/booking-sync.md` |

No new dependencies.

## Creating the first Super Admin

```bash
FINANCE_ADMIN_PASSWORD='choose-a-strong-one' pnpm finance:create-admin -- --username owner --name "Owner Name" --email owner@duckegy.com
```

- Reads `MONGODB_URI` from `.env.local` (point it at production to create the real admin).
- Without `FINANCE_ADMIN_PASSWORD` it generates a password and prints it once.
- The password is never a command-line argument, so it stays out of shell history.
- An existing username is refused. `--reset-password` resets that user's password, makes them an active
  Super Admin and signs out their sessions (use it if the owner is locked out).
- After that, the Super Admin creates every other login in the UI (`POST /users` with `password`) and
  hands it over. There is no self-signup.

## Environment

- `MONGODB_URI` must point at a **replica set** (MongoDB Atlas is one). Every multi-document action runs
  in a transaction. On a standalone `mongod`, finance writes fail with a clear 500 message. The API test
  setup now starts a single-node `MongoMemoryReplSet` for this reason; the rest of Duck's tests run
  unchanged on it.
- `JWT_SECRET` signs finance tokens too. Set `FINANCE_JWT_SECRET` to give finance its own secret
  (optional). Either way, a finance token carries `aud: duck-finance`: the finance guard requires it and
  Duck's `verifyAuthToken` rejects it, so the two token kinds never open each other's routes.
- Finance sessions last 12 hours. A password reset or deactivation bumps `tokenVersion`, which ends that
  user's existing sessions at once.

## Reference data seed

The seed runs once per database, on the first finance request (login included). It is recorded in
`fin_meta` (`reference-seed`, version 1). Upserts only insert, so a re-run never overwrites edits, and
rows a user deletes are not brought back. That second point is what made the ERP resurrect its demo
bookings and trips.

- **Seeded:** chart of accounts (64 accounts, balances not seeded), payment methods, channels,
  locations, cost centers, expense mappings, asset categories, activity types, the service list,
  internal controls, the ERP's role templates (`customRoles`) and the 12 periods of the current year,
  all Open.
- **Not seeded:** users, customers, suppliers, invoices, receipts, expenses, journals, bookings, trips,
  fixed assets, opening balances, tour types and captains. Tour types and captains held the ERP's demo
  people and tours; the owner enters the real ones in Settings.
- **Later months:** a posting into a month with no period creates an Open period for that month.

## Permissions

Reading the books (GET lists, `/state`, `/settings`) needs only a valid login. The checks below run on
the server, and `user.permissions` carries the result so the UI can hide buttons.

| Permission | Guards | Roles |
| --- | --- | --- |
| `users:manage` | users list/create/update (incl. password reset), custom roles CRUD | Super Admin |
| `accounts:manage` | create/update accounts | SA, CFO, Chief Acc |
| `invoices:create` | invoices, booking → invoice | SA, CFO, Chief Acc, Accountant, Cashier |
| `receipts:create` / `expenses:create` | receipts / expense vouchers | SA, CFO, Chief Acc, Accountant, Cashier |
| `journals:draft` | manual journal saved as draft | SA, CFO, Chief Acc, Accountant |
| `journals:post` | posted manual journal, reversal | SA, CFO, Chief Acc |
| `finance:lock_period` | lock/unlock periods | SA, CFO, Chief Acc |
| `assets:manage` | fixed assets, categories, depreciation, disposal | SA, CFO, Chief Acc, Accountant |
| `opening_balances:manage` / `:post` | edit/import batches / post them | manage: SA, CFO, Chief Acc, Accountant; post: SA, CFO, Chief Acc |
| `settings:manage` | tour types, captains, services | SA, CFO, Ops Manager |
| `controls:manage` | internal controls | SA, CFO |
| `catalog:manage` | trips, activity types | SA, CFO, Ops Manager |
| `pricing:approve` | schedule price change; any trip edit that changes a price | SA, CFO |
| `bookings:manage` | create/update bookings | SA, CFO, Cashier, Ops Manager |
| `reports:full` | GL, trial balance, statements, subledgers, profitability, asset movement | SA, CFO, Chief Acc, Accountant, Auditor |
| `audit:read` | `/audit-logs`, audit entries in `/state` | SA, CFO, Chief Acc, Auditor |
| `acceptance:run` | acceptance test | SA, CFO, Chief Acc |

A user may also hold one custom role (`customRoleId`). Its active permissions are added to the built-in
role's. The names match the checkboxes in Internal Controls. The ERP's template names are aliased:
`reports:read` / `statements:read` → `reports:full`, `finance:post` → `journals:post` and
`opening_balances:post`, and so on (see `auth/permissions.ts`).

## Deviations from the shared contract

The paths, methods, body fields and response shapes are as `server.ts` had them, except:

1. **Document numbers are always server-assigned**, from atomic counters in `fin_counters`. Client-sent
   `invoiceNumber`, `receiptNumber`, `voucherNumber`, `journalNumber` (manual journals), `bookingNumber`
   and `batchNumber` are ignored.
   - Format: `INV-2026-0001`, `RCP-…`, `EXP-…`, `JV-…`, `BKG-…` (4 digits, year of the document date)
     and `OB-2026-001`.
   - Document journals stay `JV-<doc number>`, with `REV-<number>`, `JV-OPEN-<year>` and
     `JV-DEP-<YYYY-MM>` as before.
   - When not supplied, trip codes, asset ids and asset-category codes come from counters too
     (`TRIP-001`, `AST-000001`, `AC-01`).
   - A failed save rolls its number back.
2. **The journal period comes from the journal date.** A client `periodId` is ignored. Posting into a
   Locked or Closed period returns 400 and writes nothing.
3. **`/state`** needs a token.
   - `users` lists every user only for `users:manage` holders; others get just themselves.
   - `auditLogs` is the newest 500 entries, and only for `audit:read` holders. Storage is unbounded.
   - **Added** `GET /audit-logs?limit=&before=<ISO timestamp>` pages back through older entries.
4. **Added** `GET /invoices/:id`.
5. **User objects** carry `permissions` (effective list, `'*'` for Super Admin) and an optional
   `customRoleId`. `passwordHash` is never returned.
6. **Status codes:** not-found is 404 (the ERP used 400). Login returns 429 after 10 failed attempts per
   IP in 15 minutes. Unexpected errors are 500 `{"error":"Internal server error"}`.
7. **Settings list PUTs** accept either `{tourTypes: [...]}` / `{captains}` / `{services}` or a bare
   array, as the ERP did.

## ERP bugs fixed while porting

The ones on the brief:

- `x-user-id` trust and the Super Admin fallback are gone. Every route except login needs a finance
  bearer token.
- The audit log is unbounded.
- The acceptance test runs on throwaway `fin_acctest_<run>_*` collections, seeded with reference data
  and dropped afterwards, so it never reads or writes the real books.
- Invoice tax is credited to 2150, so taxed invoices balance.
- Periods are derived from the document date; Locked and Closed periods are blocked.
- A receipt above the invoice's open balance is rejected with 400, as is an invoice whose `paidAmount`
  exceeds its total.
- Numbering comes from atomic counters (see deviation 1).
- The hard-coded fallbacks are removed:
  - The captain and asset custodian default to `''`, not 'Captain Hamada'.
  - There is no 'c-001' customer fallback: an invoice needs an existing `customerId` or a
    `customerName` (which creates the customer), and an unlinked receipt needs an existing customer.
  - A new customer's nationality is `''`.
  - There is no random `WEB-…` booking or invoice reference, and no fake `duck-<timestamp>` website trip
    id.
  - The asset supplier no longer defaults to 'Aswan Marine Gear'.
- Demo data is never reseeded (see the seed section).

Found while porting, fixed because they broke the books:

- **Paid and partially-paid invoices posted no journal.** The ERP only posted when `status` was
  `approved` or `issued`, but its invoice form sends `paid` / `partially_paid` when money is taken up
  front. Every invoice except `draft` / `pending_review` now posts. On posted invoices the server
  derives `status` from the numbers: `paid`, `partially_paid`, otherwise `approved` / `issued`.
- **Reversals counted twice.** The ERP dropped a journal from all balances once it was `reversed` while
  also counting its reversal. Balances, GL and TB now count `posted` and `reversed` journals, so a
  journal and its reversal net to zero. A journal can only be reversed once, even under concurrent
  requests.
- **Opening balance batches** could be set to `Posted` through `PUT` without a journal. Only
  `POST /:id/post` posts now, and a unique index allows one posted batch per fiscal year.
- **Account balances** are derived from journal lines on every read, never stored, so they cannot
  drift.
- **Smaller tightening:**
  - Negative amounts and discounts above the line amount are rejected.
  - A draft invoice cannot carry a payment, and customer running totals move only for posted invoices.
  - A receipt must target a collectable invoice (approved, issued or partially paid).
  - A booking needs at least one guest, and its deposit cannot exceed its total.
  - An account's `code` cannot be changed.
  - Asset status can't be set to Disposed/Sold except through dispose.
  - Deleting a custom role unassigns it from users.

## ERP logic kept as-is, for the accountant to review

These are ported unchanged on purpose; changing them is accounting policy, not porting:

- **Financial statements** use movements excluding opening-balance journals (the ERP's
  `periodDebit - periodCredit` with no date range). The balance sheet therefore omits opening balances
  on both sides. It still balances, but it is not a cumulative balance sheet.
- **Asset movement report:** keeps the ERP's fixed 2,500 / 1,000 EGP adjustments and ignores its date
  range.
- **Tour profitability:** keeps its demo fallback figures for tour types with no invoices and the flat
  27% direct cost. A later session replaces both.
- **Internal controls** (approval limit, two-step approval, segregation of duties) are stored and
  returned but not enforced, as in the ERP. Locked-period blocking is always on.
- **Acceptance step 6** books revenue a second time, as the ERP's script did. It is harmless now that
  the run is sandboxed.
- **Unlinked receipts** (no invoice) still credit receivables and clamp the customer's outstanding
  balance at zero.
