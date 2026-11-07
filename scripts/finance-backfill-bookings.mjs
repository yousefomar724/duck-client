// Imports existing Duck Aswan bookings into the finance ERP from a go-live date.
//
//   node --env-file=.env.local scripts/finance-backfill-bookings.mjs --from 2026-11-01 --dry-run
//   node --env-file=.env.local scripts/finance-backfill-bookings.mjs --from 2026-11-01
//
// Options:
//   --from YYYY-MM-DD   first activity date (Cairo) to import; required
//   --dry-run           print the totals per month and write nothing
//   --url <origin>      the Duck deployment to run against (default NEXT_PUBLIC_SITE_URL,
//                       else http://localhost:3000)
//   --limit <n>         bookings per request (default 100, max 500)
//
// It drives POST /api/v1/cron/finance-sync page by page with CRON_SECRET, so the
// mapping is exactly the one the live sync uses. A real run is idempotent:
// re-running it, or running it over bookings the live sync already posted,
// posts nothing twice. It also records --from as the go-live date: earlier
// bookings are never imported by a later Duck write.
import { parseArgs } from 'node:util';

function fail(message) {
  console.error(`finance-backfill-bookings: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    from: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    url: { type: 'string' },
    limit: { type: 'string', default: '100' },
  },
});

const from = values.from ?? '';
if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) fail('--from YYYY-MM-DD is required.');
const dryRun = values['dry-run'];
const secret = process.env.CRON_SECRET;
if (!secret) fail('CRON_SECRET is not set (run with --env-file=.env.local).');
const origin = (values.url ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const limit = Math.min(Math.max(Number(values.limit) || 100, 1), 500);
const endpoint = `${origin}/api/v1/cron/finance-sync`;

const months = new Map();
const skipped = [];
const failures = [];
let scanned = 0;
let after = null;

console.log(`${dryRun ? 'Dry run' : 'Backfill'} of Duck Aswan bookings from ${from} via ${endpoint}`);

for (let page = 1; ; page += 1) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
    body: JSON.stringify({ from, dryRun, after, limit }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) fail(`request ${page} failed (${res.status}): ${body.error ?? res.statusText}`);

  scanned += body.scanned;
  for (const m of body.months) {
    const sum = months.get(m.month) ?? { month: m.month, bookings: 0, revenue: 0, cashIn: 0, cashHeld: 0 };
    sum.bookings += m.bookings;
    sum.revenue += m.revenue;
    sum.cashIn += m.cashIn;
    sum.cashHeld += m.cashHeld;
    months.set(m.month, sum);
  }
  skipped.push(...body.skipped);
  failures.push(...body.failures);
  process.stdout.write(`  page ${page}: ${body.scanned} bookings\n`);
  if (!body.next) break;
  after = body.next;
}

const money = (n) => (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rows = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
const total = rows.reduce(
  (t, r) => ({ bookings: t.bookings + r.bookings, revenue: t.revenue + r.revenue, cashIn: t.cashIn + r.cashIn, cashHeld: t.cashHeld + r.cashHeld }),
  { bookings: 0, revenue: 0, cashIn: 0, cashHeld: 0 },
);

console.log('');
console.log('Month     Bookings   Net revenue (EGP)   Received (EGP)   Held now (EGP)');
for (const r of [...rows, { month: 'Total  ', ...total }]) {
  console.log(
    `${r.month.padEnd(9)} ${String(r.bookings).padStart(8)}   ${money(r.revenue).padStart(17)}   ${money(r.cashIn).padStart(14)}   ${money(r.cashHeld).padStart(14)}`,
  );
}
console.log('');
console.log(`Scanned ${scanned} bookings; ${total.bookings} ${dryRun ? 'would be' : 'were'} imported, ${skipped.length} skipped (never sold or unsupported).`);
const unsupported = skipped.filter((s) => !s.reason.startsWith('not sold'));
for (const s of unsupported) console.log(`  skipped ${s.duckId}: ${s.reason}`);
if (failures.length) {
  console.log(`${failures.length} failed and were queued for the cron to retry:`);
  for (const f of failures) console.log(`  ${f.duckId}: ${f.error}`);
  process.exitCode = 2;
}
if (dryRun) console.log('Dry run: nothing was written.');
