import type { UserRole } from '@/lib/finance/erp-types';

/**
 * Server-enforced finance permissions. Names reuse the ERP's custom-role
 * permission vocabulary (InternalControlsView), so a custom role built in
 * the UI grants exactly what its checkboxes say.
 */
export const PERMISSIONS = {
  reportsRead: 'reports:full',
  auditRead: 'audit:read',
  usersManage: 'users:manage',
  accountsManage: 'accounts:manage',
  invoicesCreate: 'invoices:create',
  receiptsCreate: 'receipts:create',
  expensesCreate: 'expenses:create',
  journalsDraft: 'journals:draft',
  journalsPost: 'journals:post',
  periodLock: 'finance:lock_period',
  assetsManage: 'assets:manage',
  openingBalancesManage: 'opening_balances:manage',
  openingBalancesPost: 'opening_balances:post',
  settingsManage: 'settings:manage',
  controlsManage: 'controls:manage',
  catalogManage: 'catalog:manage',
  pricingApprove: 'pricing:approve',
  bookingsManage: 'bookings:manage',
  acceptanceRun: 'acceptance:run',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const P = PERMISSIONS;

/** What each built-in ERP role may do. Reading the books needs no permission beyond being signed in. */
export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  'Super Admin': ['*'],
  CFO: [
    P.reportsRead, P.auditRead, P.accountsManage, P.invoicesCreate, P.receiptsCreate, P.expensesCreate,
    P.journalsDraft, P.journalsPost, P.periodLock, P.assetsManage, P.openingBalancesManage, P.openingBalancesPost,
    P.settingsManage, P.controlsManage, P.catalogManage, P.pricingApprove, P.bookingsManage, P.acceptanceRun,
  ],
  'Chief Accountant': [
    P.reportsRead, P.auditRead, P.accountsManage, P.invoicesCreate, P.receiptsCreate, P.expensesCreate,
    P.journalsDraft, P.journalsPost, P.periodLock, P.assetsManage, P.openingBalancesManage, P.openingBalancesPost,
    P.acceptanceRun,
  ],
  Accountant: [
    P.reportsRead, P.invoicesCreate, P.receiptsCreate, P.expensesCreate, P.journalsDraft, P.assetsManage,
    P.openingBalancesManage,
  ],
  Cashier: [P.invoicesCreate, P.receiptsCreate, P.expensesCreate, P.bookingsManage],
  'Operations Manager': [P.catalogManage, P.bookingsManage, P.settingsManage],
  Auditor: [P.reportsRead, P.auditRead],
};

/**
 * Aliases from the ERP's seeded custom roles to the permissions above, so
 * e.g. "Financial Controller" (`finance:post`, `reports:read`) works as named.
 */
const ALIASES: Record<string, readonly string[]> = {
  'finance:approve': [P.invoicesCreate, P.receiptsCreate, P.expensesCreate],
  'finance:post': [P.journalsPost, P.openingBalancesPost],
  'reports:read': [P.reportsRead],
  'reports:standard': [P.reportsRead],
  'statements:read': [P.reportsRead],
  'invoices:approve': [P.invoicesCreate],
  'invoices:draft': [P.invoicesCreate],
  'bookings:create': [P.bookingsManage],
  'captains:assign': [P.settingsManage],
};

export function effectivePermissions(role: UserRole, customRolePermissions: readonly string[] = []): string[] {
  const set = new Set<string>(ROLE_PERMISSIONS[role] ?? []);
  for (const p of customRolePermissions) {
    set.add(p);
    for (const alias of ALIASES[p] ?? []) set.add(alias);
  }
  return [...set].sort();
}

export function hasPermission(permissions: readonly string[], needed: string): boolean {
  return permissions.includes('*') || permissions.includes(needed);
}
