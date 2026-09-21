import { test, expect } from '@playwright/test';
import { ADMIN_STATE } from './fixtures/auth';

test.use({ storageState: ADMIN_STATE });

test('admin bookings page loads', async ({ page }) => {
  await page.goto('/admin/bookings');
  await expect(page.getByRole('heading', { name: 'الحجوزات' })).toBeVisible({
    timeout: 15_000,
  });
});
