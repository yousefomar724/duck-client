import { financeRead } from '@/server/finance/http';
import { getUserById } from '@/server/finance/services/users';

/** `{user}` for the bearer token's finance user, including effective `permissions`. */
export const GET = financeRead({}, async (ctx) => ({ user: await getUserById(ctx, ctx.actor.id) }));
