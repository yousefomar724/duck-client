import { test, expect } from '@playwright/test';
import { SUPPLIER_STATE } from './fixtures/auth';

test.use({ storageState: SUPPLIER_STATE });

test('my bookings requires auth', async ({ page }) => {
  await page.goto('/my-bookings');

  // Both assertions have to be things the login page cannot produce. The old
  // /booking|حجز/ matched the login page too, so this passed for years without
  // ever being authenticated.

  // Rules out the 401 -> /login redirect in src/lib/api/client.ts.
  await expect(
    page.getByRole('heading', { name: 'My Bookings', level: 1 }),
  ).toBeVisible({ timeout: 15_000 });

  // The heading alone also renders in the loading and error branches, so assert
  // a column header too: those only exist once getUserBookings() has come back
  // successfully, which needs a token the API actually accepts. Holds whether or
  // not the seeded account has any bookings — the empty state keeps the table.
  await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible({
    timeout: 15_000,
  });
});
