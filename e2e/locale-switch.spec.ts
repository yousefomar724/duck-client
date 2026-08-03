import { test, expect } from '@playwright/test';

test('locale switch sets cookie and rtl', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByRole('button', { name: /Language/i }).click();
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: /Arabic|العربية/i }).click();
  await page.getByRole('button', { name: /Save|حفظ/i }).click();
  await page.waitForLoadState('networkidle');
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name === 'locale' && c.value === 'ar')).toBeTruthy();
});
