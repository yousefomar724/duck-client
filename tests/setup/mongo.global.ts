import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo: MongoMemoryServer;

export async function setup() {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
}

export async function teardown() {
  if (mongo) {
    await mongo.stop();
  }
}
