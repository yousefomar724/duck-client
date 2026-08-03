import { test, expect } from '@playwright/test';

test('booking flow reaches contact step', async ({ page }) => {
  await page.goto('/book');
  await expect(page.getByText(/trip|رحلة/i).first()).toBeVisible({ timeout: 15_000 });

  const tripCard = page.locator('[data-testid="trip-card"], button, a').filter({ hasText: /kayak|كاياك|trip|رحلة/i }).first();
  if (await tripCard.count()) {
    await tripCard.click();
  }

  await expect(page.getByText(/guest|ضيف|contact|تواصل/i).first()).toBeVisible({ timeout: 15_000 });
});
