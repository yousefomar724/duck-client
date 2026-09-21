import { test, expect } from '@playwright/test';

test('hero booking link opens the trip picker without a client crash', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await page.locator('#hero-section a[href="/book"]').click();
  await expect(page).toHaveURL(/\/book$/, { timeout: 15_000 });
  await expect(page.getByTestId('trip-card').first()).toBeVisible({ timeout: 15_000 });
  expect(pageErrors).toEqual([]);
});

test('destination and trip details render after navigation', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  for (const path of ['/destinations', '/trips']) {
    await page.goto(path);
    await page.locator(`main a[href^="${path}/"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${path}/.+`));
    await expect(page.locator('main h1')).toBeVisible();
  }
  expect(pageErrors).toEqual([]);
});

test('booking flow reaches contact step', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/book');
  const tripCard = page.getByTestId('trip-card').first();
  await expect(tripCard).toBeVisible({ timeout: 15_000 });
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await tripCard.click();

  await expect(page).toHaveURL(/(?:\?|&)step=2(?:&|$)/);
  await expect(page.getByText(/Kids aged 1–6|أطفال من 1 إلى 6/i).first()).toBeVisible();
  await expect(page.getByText(/Kids aged 7–12|أطفال من 7 إلى 12/i).first()).toBeVisible();
  expect(requests.filter((url) => url.includes('_rsc=') && url.includes('/book?'))).toEqual([]);
  expect(requests.filter((url) => url.includes('/api/v1/trips'))).toEqual([]);
  await page.goBack();
  await expect(tripCard).toBeVisible();
  await page.goForward();
  await expect(page.getByText(/Kids aged 1–6|أطفال من 1 إلى 6/i).first()).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('render failures show a recovery screen and retry restores the page', async ({ page }) => {
  let corrupt = true;
  await page.route('**/api/v1/trips?**', async (route) => {
    const response = await route.fetch();
    const trips = await response.json();
    if (corrupt && trips.length) trips[0].currency = 'invalid-currency';
    await route.fulfill({ response, json: trips });
  });
  await page.goto('/book');
  await expect(page.getByRole('heading', { name: /couldn’t display|تعذر عرض/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /My bookings|حجوزاتي/ })).toBeVisible();
  corrupt = false;
  await page.getByRole('button', { name: /Try again|حاول مرة أخرى/ }).click();
  await expect(page.getByTestId('trip-card').first()).toBeVisible();
});

test('incomplete booking links return to trip selection', async ({ page }) => {
  await page.goto('/book?step=3&trip=missing');
  await expect(page.getByTestId('trip-card').first()).toBeVisible();
  await expect(page).toHaveURL(/step=1/);
});

test('trip loading failure offers retry and recovers', async ({ page }) => {
  let failed = false;
  await page.route('**/api/v1/trips?**', async (route) => {
    if (!failed) {
      failed = true;
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Unavailable"}' });
    } else {
      await route.continue();
    }
  });
  await page.goto('/book');
  const alert = page.getByRole('alert').filter({ hasText: /couldn’t load|تعذر تحميل/ });
  await expect(alert).toBeVisible();
  await alert.getByRole('button').click();
  await expect(page.getByTestId('trip-card').first()).toBeVisible();
  await expect(alert).not.toBeVisible();
});

test('guest booking tolerates unavailable browser storage', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
    Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/book');
  await page.getByTestId('trip-card').first().click();
  await expect(page.getByText(/Kids aged 1–6|أطفال من 1 إلى 6/i).first()).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('malformed saved payment details do not crash booking', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('duck.pendingInstapay', JSON.stringify({
    booking: { ID: { broken: true }, amount: 100, currency: 'invalid-currency' }, chosenAmount: 100,
  })));
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/book');
  await expect(page.getByTestId('trip-card').first()).toBeVisible();
  expect(pageErrors).toEqual([]);
});
