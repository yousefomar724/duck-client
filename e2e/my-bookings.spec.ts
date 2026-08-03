import { test, expect } from '@playwright/test';
import path from 'node:path';

test('my bookings requires auth', async ({ browser }) => {
  const context = await browser.newContext({
    storageState: path.join(__dirname, '../playwright/.auth/supplier.json'),
  });
  const page = await context.newPage();
  await page.goto('/my-bookings');
  await expect(page.getByText(/booking|حجز/i).first()).toBeVisible({ timeout: 15_000 });
  await context.close();
});
