import mongoose from 'mongoose';
// Registers every model as a side effect. Next.js route handlers each run as
// separate module graphs — a route that only imports `Trip` and calls
// `.populate('supplier_id')` will throw `Schema hasn't been registered for
// model "Supplier"` unless something in that graph has already imported the
// Supplier model. Importing the full set here, once, before any query runs
// guarantees every ref resolves regardless of which route triggered it.
import { User } from '../models';

declare global {
  var _mongooseConn: Promise<typeof mongoose> | undefined;
}

export function dbConnect(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  if (!global._mongooseConn) {
    global._mongooseConn = mongoose.connect(uri, { bufferCommands: false }).then(async (conn) => {
      // Self-heals a bad index from an earlier schema version: `wallet_id`
      // defaulted to `null`, defeating its sparse unique index (sparse only
      // skips *absent* fields, not explicit nulls) and causing a duplicate-key
      // error on the second user ever created. Cheap once-per-process check.
      await User.syncIndexes();
      return conn;
    });
  }

  return global._mongooseConn;
}
