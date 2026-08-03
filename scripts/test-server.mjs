import { spawn } from 'node:child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';

const PORT = 3000;

async function main() {
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET ??= 'test-jwt-secret-for-e2e-only-32chars';
  process.env.CRON_SECRET ??= 'test-cron-secret';
  process.env.NEXT_PUBLIC_SITE_URL ??= `http://localhost:${PORT}`;
  process.env.SEED_ADMIN_PASSWORD ??= 'DuckAdmin123!';
  process.env.SEED_SUPPLIER_PASSWORD ??= 'DuckSupplier123!';

  const seed = spawn('node', ['scripts/seed.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, MONGODB_URI: uri },
  });

  await new Promise((resolve, reject) => {
    seed.on('exit', (code) => (code === 0 ? resolve(undefined) : reject(new Error(`seed failed: ${code}`))));
  });

  const build = spawn('pnpm', ['build'], {
    stdio: 'inherit',
    env: { ...process.env, MONGODB_URI: uri },
    shell: true,
  });

  await new Promise((resolve, reject) => {
    build.on('exit', (code) => (code === 0 ? resolve(undefined) : reject(new Error(`build failed: ${code}`))));
  });

  const server = spawn('pnpm', ['start', '-p', String(PORT)], {
    stdio: 'inherit',
    env: { ...process.env, MONGODB_URI: uri, PORT: String(PORT) },
    shell: true,
  });

  const shutdown = async () => {
    server.kill('SIGTERM');
    await mongo.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  server.on('exit', (code) => {
    mongo.stop().finally(() => process.exit(code ?? 0));
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
