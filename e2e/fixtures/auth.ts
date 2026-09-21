import { test as base, expect } from '@playwright/test';
import path from 'node:path';

export const test = base;
export { expect };

/**
 * storageState files written by e2e/auth.setup.ts before the specs run.
 *
 * Generated per run rather than committed: a stored JWT pins the user's `_id`
 * and an expiry, so a checked-in copy silently stops authenticating once the
 * database is recreated or the token lapses.
 */
const AUTH_DIR = path.join(__dirname, '..', '..', 'playwright', '.auth');

export const ADMIN_STATE = path.join(AUTH_DIR, 'admin.json');
export const SUPPLIER_STATE = path.join(AUTH_DIR, 'supplier.json');
