import { test as setup, expect, type APIRequestContext, type Page } from '@playwright/test';
import { ADMIN_STATE, SUPPLIER_STATE } from './fixtures/auth';

/**
 * Mints the storageState files the authenticated specs load.
 *
 * These used to be left-over files sitting in playwright/.auth/ from some earlier
 * run, and they could never have kept working: scripts/test-server.mjs starts a
 * MongoMemoryServer on a fresh temp dbPath every run, so each run seeds brand new
 * user documents with brand new `_id`s. A saved JWT pins the `_id` it was minted
 * for, so the very next run authenticated as a user that no longer existed — the
 * API 401'd and src/lib/api/client.ts redirected the spec to /login, which is why
 * admin-bookings kept asserting against a login form. (The tokens expire too.)
 *
 * Credentials mirror the seed defaults; override both here and in the seed via
 * SEED_ADMIN_PASSWORD / SEED_SUPPLIER_PASSWORD.
 */
const ADMIN_EMAIL = 'admin@duckegy.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'DuckAdmin123!';
const SUPPLIER_EMAIL = 'duck.asw@gmail.com';
const SUPPLIER_PASSWORD = process.env.SEED_SUPPLIER_PASSWORD || 'DuckSupplier123!';

/** Matches TOKEN_KEY in src/lib/auth/token.ts. */
const TOKEN_KEY = 'duck_auth_token';

async function saveSession(
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string,
  statePath: string,
) {
  const response = await request.post('/api/v1/auth/login', {
    data: { email, password },
  });
  expect(
    response.ok(),
    `login failed for ${email} (${response.status()}) — is the DB seeded?`,
  ).toBeTruthy();

  const { token } = (await response.json()) as { token?: string };
  expect(token, `no token returned for ${email}`).toBeTruthy();

  // storageState only captures localStorage for origins the context has
  // actually visited, so load the app before writing the token.
  await page.goto('/');
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [TOKEN_KEY, token!] as const,
  );

  await page.context().storageState({ path: statePath });
}

setup('authenticate as admin', async ({ page, request }) => {
  await saveSession(page, request, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_STATE);
});

setup('authenticate as supplier', async ({ page, request }) => {
  await saveSession(page, request, SUPPLIER_EMAIL, SUPPLIER_PASSWORD, SUPPLIER_STATE);
});
