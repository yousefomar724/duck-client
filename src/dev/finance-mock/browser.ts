import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

let started: Promise<unknown> | null = null;

/** Start the MSW service worker once. Dev-only; see MockGate. */
export function startFinanceMock(): Promise<unknown> {
  started ??= setupWorker(...handlers).start({
    // Served by src/app/finance/mockServiceWorker.js/route.ts (dev only).
    serviceWorker: { url: '/finance/mockServiceWorker.js', options: { scope: '/finance' } },
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
  return started;
}
