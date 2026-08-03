import { test, expect } from '@playwright/test';
import path from 'node:path';

test('admin bookings page loads', async ({ browser }) => {
  const context = await browser.newContext({
    storageState: path.join(__dirname, '../playwright/.auth/admin.json'),
  });
  const page = await context.newPage();
  await page.goto('/admin/bookings');
  await expect(page.getByRole('heading', { name: 'الحجوزات' })).toBeVisible({
    timeout: 15_000,
  });
  await context.close();
});
