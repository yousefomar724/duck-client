import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { ADMIN_STATE } from './fixtures/auth';

// Same seed accounts as auth.setup.ts.
const ADMIN = { email: 'admin@duckegy.com', password: process.env.SEED_ADMIN_PASSWORD || 'DuckAdmin123!' };
const SUPPLIER = {
  email: 'duck.asw@gmail.com',
  password: process.env.SEED_SUPPLIER_PASSWORD || 'DuckSupplier123!',
};
const TRIP_NAME = 'Free-style Nile Kayaking';

async function login(request: APIRequestContext, who: { email: string; password: string }) {
  const res = await request.post('/api/v1/auth/login', { data: who });
  expect(res.ok(), `login failed for ${who.email}`).toBeTruthy();
  return ((await res.json()) as { token: string }).token;
}

/** Both browser projects run against one database, so every code is unique. */
function uniqueCode(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function seededTrip(request: APIRequestContext) {
  const res = await request.get('/api/v1/trips');
  const trips = (await res.json()) as { id: string; supplier_id: string; name: { en: string } }[];
  const trip = trips.find((item) => item.name.en === TRIP_NAME);
  expect(trip, `seeded trip "${TRIP_NAME}" not found`).toBeTruthy();
  return trip!;
}

async function createCode(request: APIRequestContext, token: string, body: Record<string, unknown>) {
  const res = await request.post('/api/v1/discount-codes', {
    headers: { Authorization: `Bearer ${token}` },
    data: body,
  });
  expect(res.status(), await res.text()).toBe(201);
  return res.json();
}

/** Picks the seeded trip, fills contact details and lands on the payment step. */
async function reachPaymentStep(page: Page, phone: string) {
  await page.goto('/book');
  await page.getByTestId('trip-card').filter({ hasText: TRIP_NAME }).first().click();
  await expect(page).toHaveURL(/(?:\?|&)step=2(?:&|$)/);
  await page.getByPlaceholder('e.g. John Doe').fill('E2E Discount Guest');
  await page.locator('input[type="tel"]').fill(phone);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByTestId('discount-code-field')).toBeVisible({ timeout: 15_000 });
}

async function applyCode(page: Page, code: string) {
  const field = page.getByTestId('discount-code-field');
  await field.getByRole('textbox').fill(code);
  await field.getByRole('button', { name: 'Apply' }).click();
}

async function bookingIdFrom(page: Page, submit: () => Promise<void>) {
  const created = page.waitForResponse(
    (res) => res.url().includes('/api/v1/bookings/manual') && res.request().method() === 'POST',
  );
  await submit();
  const res = await created;
  expect(res.status()).toBe(201);
  return ((await res.json()) as { booking: { ID: string; amount: number } }).booking;
}

async function codeReportRow(request: APIRequestContext, adminToken: string, supplierId: string, code: string) {
  const today = new Date();
  const later = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const ymd = (date: Date) => date.toISOString().slice(0, 10);
  const res = await request.get(
    `/api/v1/reports/overview?from=${ymd(today)}&to=${ymd(later)}&supplier_id=${supplierId}`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    discount_codes: { code: string; uses: number; discount_given: number; revenue: number }[];
  };
  return body.discount_codes.find((row) => row.code === code);
}

const inFiveDays = () => new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

test('a supplier code discounts the booking, and the supplier confirms it', async ({ page, request }) => {
  const supplierToken = await login(request, SUPPLIER);
  const adminToken = await login(request, ADMIN);
  const trip = await seededTrip(request);
  const code = uniqueCode('SUP20');
  await createCode(request, supplierToken, {
    code,
    type: 'percentage',
    value: 20,
    expires_at: inFiveDays(),
  });

  await reachPaymentStep(page, '01012345671');
  await applyCode(page, code.toLowerCase());
  await expect(page.getByText(`Code ${code} applied`)).toBeVisible();
  // One local guest: 180, 20% off = 36, so 144 to pay.
  await expect(page.getByText(`Discount (${code})`)).toBeVisible();
  await expect(page.getByTestId('discount-code-field')).toContainText('36');

  const booking = await bookingIdFrom(page, () =>
    page.getByRole('button', { name: /Confirm booking & pay via InstaPay/ }).click(),
  );
  expect(booking.amount).toBe(144);
  await expect(page.getByText('Almost done — payment required')).toBeVisible();
  await expect(page.getByTestId('instapay-step')).toBeVisible();

  const confirm = await request.post(`/api/v1/bookings/${booking.ID}/manual-confirm`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { amount_paid: 144 },
  });
  expect(confirm.ok()).toBeTruthy();

  const row = await codeReportRow(request, adminToken, trip.supplier_id, code);
  expect(row).toMatchObject({ uses: 1, discount_given: 36, revenue: 144 });
});

test('a 100% Duck code makes a free booking with no InstaPay step', async ({ page, request }) => {
  const supplierToken = await login(request, SUPPLIER);
  const adminToken = await login(request, ADMIN);
  const trip = await seededTrip(request);
  const code = uniqueCode('FREE');
  await createCode(request, adminToken, {
    code,
    type: 'percentage',
    value: 100,
    supplier_id: trip.supplier_id,
    expires_at: inFiveDays(),
  });

  await reachPaymentStep(page, '01012345672');
  await applyCode(page, code);
  await expect(page.getByText(`Code ${code} applied`)).toBeVisible();
  await expect(page.getByRole('button', { name: /Confirm booking & pay via InstaPay/ })).toHaveCount(0);

  const booking = await bookingIdFrom(page, () =>
    page.getByRole('button', { name: 'Confirm free booking' }).click(),
  );
  expect(booking.amount).toBe(0);
  await expect(page.getByText('Free booking, waiting for confirmation').first()).toBeVisible();
  await expect(page.getByTestId('instapay-step')).toHaveCount(0);

  // The supplier confirms with nothing paid; Duck covers the full 180.
  const confirm = await request.post(`/api/v1/bookings/${booking.ID}/manual-confirm`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: {},
  });
  expect(confirm.ok(), await confirm.text()).toBeTruthy();
  const confirmed = (await confirm.json()) as {
    booking: { status: string; platform_discount_credited: number };
  };
  expect(confirmed.booking.status).toBe('CONFIRMED');
  expect(confirmed.booking.platform_discount_credited).toBe(180);

  const row = await codeReportRow(request, adminToken, trip.supplier_id, code);
  expect(row).toMatchObject({ uses: 1, discount_given: 180, revenue: 0 });
});

test('an expired code is refused and the booking stays at full price', async ({ page, request }) => {
  const supplierToken = await login(request, SUPPLIER);
  const code = uniqueCode('GONE');
  // The API only accepts a future expiry, so make one that lapses in seconds.
  await createCode(request, supplierToken, {
    code,
    type: 'percentage',
    value: 50,
    expires_at: new Date(Date.now() + 3_000).toISOString(),
  });
  await page.waitForTimeout(3_500);

  await reachPaymentStep(page, '01012345673');
  await applyCode(page, code);
  await expect(page.getByRole('alert').filter({ hasText: 'This code has expired' })).toBeVisible();
  await expect(page.getByText(`Code ${code} applied`)).toHaveCount(0);

  const booking = await bookingIdFrom(page, () =>
    page.getByRole('button', { name: /Confirm booking & pay via InstaPay/ }).click(),
  );
  expect(booking.amount).toBe(180);
});

test.describe('dashboard', () => {
  test.use({ storageState: ADMIN_STATE });

  test('admin discount codes page lists a new code', async ({ page, request }) => {
    const adminToken = await login(request, ADMIN);
    const code = uniqueCode('LIST');
    await createCode(request, adminToken, {
      code,
      type: 'fixed',
      value: 50,
      currency: 'EGP',
      expires_at: inFiveDays(),
    });
    await page.goto('/admin/discount-codes');
    await expect(page.getByRole('heading', { name: 'أكواد الخصم' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(code).first()).toBeVisible();
  });
});
