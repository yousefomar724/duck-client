import type { User, UserRole } from '@/lib/finance/erp-types';
import { USER_ROLES } from '@/lib/finance/erp-types';
import { comparePassword, hashPassword } from '@/server/auth/password';
import { effectivePermissions } from '../auth/permissions';
import { signFinanceToken } from '../auth/jwt';
import type { FinanceModels } from '../models';
import type { FinUserDoc } from '../models/users';
import { logAudit } from './audit';
import { FinanceError, badRequest, notFound, so, type FinCtx, type FinanceActor } from './context';
import { toOut } from './util';

export const MIN_PASSWORD_LENGTH = 8;

type StoredUser = Pick<FinUserDoc, '_id' | 'username' | 'name' | 'email' | 'role' | 'active' | 'avatar' | 'customRoleId'>;

async function customRolePermissions(m: FinanceModels, customRoleId?: string, session: FinCtx['session'] = null) {
  if (!customRoleId) return [];
  const role = await m.CustomRole.findById(customRoleId).lean().session(session);
  return role?.active ? role.permissions : [];
}

/** The API shape of a finance user, with its effective permissions. */
export async function toUser(m: FinanceModels, doc: StoredUser, session: FinCtx['session'] = null): Promise<User> {
  const user = toOut<User>(doc);
  user.permissions = effectivePermissions(doc.role, await customRolePermissions(m, doc.customRoleId, session));
  return user;
}

export async function actorFor(m: FinanceModels, doc: StoredUser): Promise<FinanceActor> {
  const user = await toUser(m, doc);
  return { id: user.id, name: user.name, role: user.role, permissions: user.permissions ?? [] };
}

function validPassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  return password;
}

function validRole(role: unknown): UserRole {
  if (!USER_ROLES.includes(role as UserRole)) throw badRequest('Unknown role.');
  return role as UserRole;
}

async function validCustomRole(ctx: FinCtx, id: unknown): Promise<string | undefined> {
  if (id === undefined || id === null || id === '') return undefined;
  const role = await ctx.m.CustomRole.findById(String(id)).lean().session(ctx.session);
  if (!role) throw badRequest(`Custom role ${String(id)} not found.`);
  return role._id;
}

export async function listUsers(ctx: FinCtx): Promise<User[]> {
  const docs = await ctx.m.User.find().sort({ createdAt: 1, _id: 1 }).lean().session(ctx.session);
  return Promise.all(docs.map((d) => toUser(ctx.m, d, ctx.session)));
}

export async function getUserById(ctx: FinCtx, id: string): Promise<User> {
  const doc = await ctx.m.User.findById(id).lean().session(ctx.session);
  if (!doc) throw notFound(`User ${id} not found.`);
  return toUser(ctx.m, doc, ctx.session);
}

/** Super Admin creates a staff login and hands the password over. */
export async function createUser(ctx: FinCtx, data: Record<string, unknown>): Promise<User> {
  const username = typeof data.username === 'string' ? data.username.trim().toLowerCase() : '';
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    throw badRequest('Username must be 3-40 characters: letters, digits, dot, dash or underscore.');
  }
  const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : '';
  if (!name) throw badRequest('Name is required.');
  const password = validPassword(data.password);
  const role = validRole(data.role ?? 'Accountant');
  if (await ctx.m.User.exists({ username }).session(ctx.session)) throw badRequest(`Username ${username} is already taken.`);

  const [doc] = await ctx.m.User.create(
    [
      {
        username,
        name,
        email: typeof data.email === 'string' ? data.email.trim() : '',
        role,
        customRoleId: await validCustomRole(ctx, data.customRoleId),
        active: data.active !== false,
        avatar: typeof data.avatar === 'string' ? data.avatar : undefined,
        passwordHash: await hashPassword(password),
        tokenVersion: 0,
      },
    ],
    so(ctx),
  );
  await logAudit(ctx, 'CREATE_USER', 'User', doc._id, `Created user ${doc.name} (${doc.role})`);
  return toUser(ctx.m, doc, ctx.session);
}

async function activeSuperAdmins(ctx: FinCtx, excludeId: string) {
  return ctx.m.User.countDocuments({ role: 'Super Admin', active: true, _id: { $ne: excludeId } }).session(ctx.session);
}

/** Role change, profile edits, deactivation and password reset (Super Admin only). */
export async function updateUser(ctx: FinCtx, id: string, updates: Record<string, unknown>): Promise<User> {
  const doc = await ctx.m.User.findById(id).select('+tokenVersion').session(ctx.session);
  if (!doc) throw notFound(`User ${id} not found.`);

  if (typeof updates.username === 'string' && updates.username.trim().toLowerCase() !== doc.username) {
    const username = updates.username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw badRequest('Username is invalid.');
    if (await ctx.m.User.exists({ username, _id: { $ne: id } }).session(ctx.session)) {
      throw badRequest(`Username ${username} is already taken.`);
    }
    doc.username = username;
  }
  if (typeof updates.name === 'string' && updates.name.trim()) doc.name = updates.name.trim();
  if (typeof updates.email === 'string') doc.email = updates.email.trim();
  if (typeof updates.avatar === 'string') doc.avatar = updates.avatar;
  if (updates.role !== undefined) doc.role = validRole(updates.role);
  if ('customRoleId' in updates) doc.customRoleId = await validCustomRole(ctx, updates.customRoleId);
  let revoke = false;
  if (typeof updates.active === 'boolean' && updates.active !== doc.active) {
    doc.active = updates.active;
    revoke ||= !updates.active;
  }
  if (updates.password !== undefined) {
    doc.passwordHash = await hashPassword(validPassword(updates.password));
    revoke = true;
  }
  // Signing out everywhere: tokens carry the version they were issued with.
  if (revoke) doc.tokenVersion = (doc.tokenVersion ?? 0) + 1;

  const stillAdmin = doc.role === 'Super Admin' && doc.active;
  if (!stillAdmin && (await activeSuperAdmins(ctx, id)) === 0) {
    throw badRequest('The last active Super Admin cannot be demoted or deactivated.');
  }

  await doc.save(so(ctx));
  await logAudit(
    ctx,
    'UPDATE_USER',
    'User',
    id,
    `Updated user ${doc.name} (Role: ${doc.role})${updates.password !== undefined ? ' — password reset' : ''}`,
  );
  return toUser(ctx.m, doc, ctx.session);
}

/** Username + password login. Same error for unknown user, wrong password and inactive account. */
export async function login(m: FinanceModels, username: unknown, password: unknown): Promise<{ token: string; user: User }> {
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    throw badRequest('Username and password are required.');
  }
  const doc = await m.User.findOne({ username: username.trim().toLowerCase() }).select('+passwordHash +tokenVersion');
  const ok = doc ? await comparePassword(password, doc.passwordHash) : false;
  if (!doc || !ok || !doc.active) throw new FinanceError(401, 'Invalid username or password');
  return { token: signFinanceToken(doc._id, doc.tokenVersion ?? 0), user: await toUser(m, doc) };
}
