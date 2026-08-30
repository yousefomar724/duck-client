import { mkdirSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo: MongoMemoryServer;

export async function setup() {
  // Keep mongod data on the project volume. Windows %TEMP% often lives on C:
  // and MongoDB 8 refuses to start when that drive has < 512MB free.
  const root = join(process.cwd(), '.mongo-mem');
  mkdirSync(root, { recursive: true });
  process.env.TMPDIR = root;
  process.env.TEMP = root;
  process.env.TMP = root;
  const dbPath = mkdtempSync(join(root, 'instance-'));

  mongo = await MongoMemoryServer.create({
    instance: {
      dbPath,
      args: ['--wiredTigerCacheSizeGB', '0.25'],
    },
  });
  process.env.MONGODB_URI = mongo.getUri();
}

export async function teardown() {
  if (mongo) {
    await mongo.stop({ doCleanup: true, force: true });
  }
}
