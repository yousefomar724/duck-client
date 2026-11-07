'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * Starts the dev-only MSW mock of the finance API before the ERP mounts.
 * Opt in with NEXT_PUBLIC_FINANCE_MSW=1 (see `pnpm dev:finance-mock`).
 *
 * Both conditions are build-time constants, so in a production build the
 * branch — and the dynamic import of the mock — is dead code and dropped.
 */
const MOCK_ENABLED =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FINANCE_MSW === '1';

export function MockGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!MOCK_ENABLED);

  useEffect(() => {
    if (!MOCK_ENABLED) return;
    let cancelled = false;
    import('@/dev/finance-mock/browser')
      .then((m) => m.startFinanceMock())
      .then(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready ? <>{children}</> : null;
}
