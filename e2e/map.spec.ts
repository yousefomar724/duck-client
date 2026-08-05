import { test, expect } from '@playwright/test';

test('map page loads', async ({ page }) => {
  await page.goto('/map');
  await expect(page.locator('.maplibregl-map')).toBeVisible({ timeout: 15_000 });
});
