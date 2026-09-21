import { test, expect } from '@playwright/test';
import { SUPPLIER_STATE } from './fixtures/auth';

test.use({ storageState: SUPPLIER_STATE });

test('my bookings requires auth', async ({ page }) => {
  await page.goto('/my-bookings');
  await expect(page.getByText(/booking|حجز/i).first()).toBeVisible({ timeout: 15_000 });
});
