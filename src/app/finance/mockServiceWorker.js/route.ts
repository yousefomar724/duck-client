import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Serves MSW's service worker script for the dev-only finance API mock.
 * Lives here (not in /public) so nothing mock-related is shipped: in
 * production this route is a 404.
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Not found', { status: 404 });
  }
  const file = path.join(process.cwd(), 'node_modules', 'msw', 'lib', 'mockServiceWorker.js');
  const body = await readFile(file, 'utf8');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
      // Default scope would be /finance/, which excludes the page at /finance.
      'Service-Worker-Allowed': '/finance',
    },
  });
}
