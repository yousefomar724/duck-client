import { test, expect } from '@playwright/test';

test('booking flow reaches contact step', async ({ page }) => {
  await page.goto('/book');
  await expect(page.getByText(/trip|رحلة/i).first()).toBeVisible({ timeout: 15_000 });

  const tripCard = page.getByTestId('trip-card').first();
  await expect(tripCard).toBeVisible();
  await tripCard.click();

  await expect(page).toHaveURL(/(?:\?|&)step=2(?:&|$)/);
  await expect(page.getByText(/guest|ضيف|contact|تواصل|بالغ|adult/i).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Kids aged 1–6|أطفال من 1 إلى 6/i).first()).toBeVisible();
  await expect(page.getByText(/Kids aged 7–12|أطفال من 7 إلى 12/i).first()).toBeVisible();
});
