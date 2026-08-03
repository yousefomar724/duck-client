import { User, type UserDoc } from '../models/user';

/**
 * Go's repository methods (`GetByID`, `GetByEmail`, `GetByUsername`,
 * `GetByGoogleID`) all append `AND active = true` — a deactivated user's
 * token still verifies, but every downstream lookup 404s. Reproduced here.
 */
export function findActiveUserById(id: string): Promise<UserDoc | null> {
  return User.findOne({ _id: id, active: true });
}

export function findActiveUserByEmail(email: string): Promise<UserDoc | null> {
  return User.findOne({ email, active: true });
}

export function findActiveUserByGoogleId(googleId: string): Promise<UserDoc | null> {
  return User.findOne({ google_id: googleId, active: true });
}
