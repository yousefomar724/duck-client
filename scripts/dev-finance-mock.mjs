// Runs `next dev` with the finance API mocked by MSW (dev only).
// Usage: pnpm dev:finance-mock — then sign in at /finance/login as admin / duck-demo.
import { spawn } from 'node:child_process';

const child = spawn('pnpm', ['exec', 'next', 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NEXT_PUBLIC_FINANCE_MSW: '1' },
});
child.on('exit', (code) => process.exit(code ?? 0));
