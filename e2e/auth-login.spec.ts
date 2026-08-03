import { test, expect } from '@playwright/test';

test('login page authenticates user', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('tab', { name: /supplier/i }).click();
  await page.locator('#email').fill('duck.asw@gmail.com');
  await page.locator('#password').fill('DuckSupplier123!');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForFunction(
    () => localStorage.getItem('duck_auth_token') !== null,
    undefined,
    { timeout: 15_000 },
  );
  const token = await page.evaluate(() => localStorage.getItem('duck_auth_token'));
  expect(token).toBeTruthy();
});
