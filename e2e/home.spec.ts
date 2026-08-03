import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const authDir = path.join(__dirname, '../playwright/.auth');

test.beforeAll(async ({ request }) => {
  fs.mkdirSync(authDir, { recursive: true });

  for (const creds of [
    { file: 'admin.json', email: 'admin@duckegy.com', password: 'DuckAdmin123!' },
    { file: 'supplier.json', email: 'duck.asw@gmail.com', password: 'DuckSupplier123!' },
  ]) {
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email: creds.email, password: creds.password },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();

    const state = {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:3000',
          localStorage: [{ name: 'duck_auth_token', value: token }],
        },
      ],
    };
    fs.writeFileSync(path.join(authDir, creds.file), JSON.stringify(state));
  }
});

test('home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/DUCK|Duckegy/i);
});
