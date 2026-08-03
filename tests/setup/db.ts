import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';

function assertLocalMongoUri(uri: string) {
  const host = new URL(uri.replace('mongodb+srv://', 'mongodb://')).hostname;
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(
      `Refusing to run tests against non-local MongoDB host "${host}". ` +
        'Use mongodb-memory-server or a localhost URI only.',
    );
  }
}

export async function connectTestDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  assertLocalMongoUri(uri);

  if (global._mongooseConn) {
    await mongoose.disconnect();
    global._mongooseConn = undefined;
  }

  await mongoose.connect(uri, { bufferCommands: false });
}

export async function clearCollections() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

export async function disconnectTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  global._mongooseConn = undefined;
}

beforeAll(async () => {
  await connectTestDb();
});

afterEach(async () => {
  await clearCollections();
});

afterAll(async () => {
  await disconnectTestDb();
});
