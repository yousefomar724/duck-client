import { getFinanceModels } from '../models';
import { FinanceError, type FinanceActor } from '../services/context';
import { actorFor } from '../services/users';
import { verifyFinanceToken } from './jwt';

/**
 * Resolves the bearer token to an active finance user. Every finance route
 * except login goes through here — the ERP trusted an `x-user-id` header and
 * fell back to the Super Admin when it was missing.
 */
export async function authenticateFinance(request: Request): Promise<FinanceActor> {
  const header = request.headers.get('authorization') ?? '';
  if (!header) throw new FinanceError(401, 'Missing Authorization header');
  if (!header.startsWith('Bearer ')) throw new FinanceError(401, 'Invalid Authorization header format');

  let claims;
  try {
    claims = verifyFinanceToken(header.slice('Bearer '.length).trim());
  } catch {
    throw new FinanceError(401, 'Invalid or expired token');
  }

  const m = getFinanceModels();
  const user = await m.User.findById(claims.sub).select('+tokenVersion').lean();
  if (!user || !user.active || (user.tokenVersion ?? 0) !== claims.ver) {
    throw new FinanceError(401, 'Invalid or expired token');
  }
  return actorFor(m, user);
}
