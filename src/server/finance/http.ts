import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { dbConnect } from '@/server/db/connect';
import { errorResponse } from '@/server/lib/json';
import { authenticateFinance } from './auth/guard';
import { hasPermission } from './auth/permissions';
import { FinanceError, inTransaction, readCtx, type FinCtx, type FinanceActor } from './services/context';
import { ensureFinanceSeed } from './services/seed';

type Params = Record<string, string>;

export interface FinanceRouteArgs<P extends Params> {
  request: Request;
  params: P;
  actor: FinanceActor;
  body: Record<string, unknown>;
  query: URLSearchParams;
}

interface RouteOptions<P extends Params> {
  /** Required permission; a function can pick one from the request (e.g. price edits). */
  permission?: string | ((args: FinanceRouteArgs<P>) => string | null);
  /** Success status (201 for creates). */
  status?: number;
}

type RouteContext<P> = { params: Promise<P> };

async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (request.method === 'GET' || request.method === 'HEAD') return {};
  const text = await request.text();
  if (!text.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new FinanceError(400, 'Invalid JSON body');
  }
  if (Array.isArray(parsed)) return { items: parsed };
  if (!parsed || typeof parsed !== 'object') throw new FinanceError(400, 'Invalid JSON body');
  return parsed as Record<string, unknown>;
}

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof FinanceError) return errorResponse(err.status, err.message);
  if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    return errorResponse(400, err.message);
  }
  console.error('[finance] unexpected error', err);
  return errorResponse(500, 'Internal server error');
}

/** Connects, seeds reference data once, authenticates and checks the permission. */
async function prepare<P extends Params>(request: Request, context: RouteContext<P> | undefined, opts: RouteOptions<P>) {
  await dbConnect();
  await ensureFinanceSeed();
  const actor = await authenticateFinance(request);
  const params = ((await context?.params) ?? {}) as P;
  const body = await readBody(request);
  const args: FinanceRouteArgs<P> = { request, params, actor, body, query: new URL(request.url).searchParams };
  const needed = typeof opts.permission === 'function' ? opts.permission(args) : opts.permission;
  if (needed && !hasPermission(actor.permissions, needed)) {
    throw new FinanceError(403, 'You do not have permission to perform this action.');
  }
  return args;
}

function respond(result: unknown, status = 200) {
  return result instanceof Response ? result : NextResponse.json(result ?? null, { status });
}

/** A read-only finance route (no transaction). */
export function financeRead<P extends Params = Params>(
  opts: RouteOptions<P>,
  handler: (ctx: FinCtx, args: FinanceRouteArgs<P>) => Promise<unknown>,
) {
  return async (request: Request, context?: RouteContext<P>) => {
    try {
      const args = await prepare(request, context, opts);
      return respond(await handler(readCtx(args.actor), args), opts.status);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/** A finance route whose writes commit in one MongoDB transaction. */
export function financeWrite<P extends Params = Params>(
  opts: RouteOptions<P>,
  handler: (ctx: FinCtx, args: FinanceRouteArgs<P>) => Promise<unknown>,
) {
  return async (request: Request, context?: RouteContext<P>) => {
    try {
      const args = await prepare(request, context, opts);
      const result = await inTransaction(args.actor, (ctx) => handler(ctx, args));
      return respond(result, opts.status);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/** A finance route that manages its own work (no wrapping transaction). */
export function financeCustom<P extends Params = Params>(
  opts: RouteOptions<P>,
  handler: (args: FinanceRouteArgs<P>) => Promise<unknown>,
) {
  return async (request: Request, context?: RouteContext<P>) => {
    try {
      const args = await prepare(request, context, opts);
      return respond(await handler(args), opts.status);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
