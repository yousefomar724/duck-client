// Creates the first finance Super Admin in `fin_users` (separate from Duck's `users`).
//
//   pnpm finance:create-admin -- --username owner --name "Owner Name" [--email x@y.z]
//
// The password comes from FINANCE_ADMIN_PASSWORD, or is generated and printed
// once. It is never taken from the command line, so it stays out of shell
// history. Refuses to touch an existing username unless --reset-password is
// given, which sets a new password, makes the user an active Super Admin and
// signs out their existing sessions.
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MIN_PASSWORD_LENGTH = 8;
const USERNAME = /^[a-z0-9._-]{3,40}$/;

function fail(message) {
  console.error(`finance-create-admin: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    username: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', default: '' },
    'reset-password': { type: 'boolean', default: false },
  },
});

const username = (values.username ?? '').trim().toLowerCase();
const name = (values.name ?? '').trim();
if (!USERNAME.test(username)) fail('--username is required (3-40 chars: a-z, 0-9, dot, dash, underscore).');
if (!name) fail('--name is required.');

const uri = process.env.MONGODB_URI;
if (!uri) fail('MONGODB_URI is not set (run with --env-file=.env.local).');

const generated = !process.env.FINANCE_ADMIN_PASSWORD;
const password = process.env.FINANCE_ADMIN_PASSWORD || randomBytes(12).toString('base64url');
if (password.length < MIN_PASSWORD_LENGTH) fail(`FINANCE_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);

await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
try {
  const users = mongoose.connection.collection('fin_users');
  await users.createIndex({ username: 1 }, { unique: true });
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  const existing = await users.findOne({ username });

  if (existing && !values['reset-password']) {
    fail(`user "${username}" already exists. Pass --reset-password to reset it.`);
  }

  if (existing) {
    await users.updateOne(
      { _id: existing._id },
      {
        $set: { passwordHash, role: 'Super Admin', active: true, name, updatedAt: now },
        $inc: { tokenVersion: 1 },
      },
    );
  } else {
    await users.insertOne({
      _id: `u-${new mongoose.Types.ObjectId().toHexString()}`,
      username,
      name,
      email: values.email.trim(),
      role: 'Super Admin',
      active: true,
      passwordHash,
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    });
  }
  await mongoose.connection.collection('fin_audit_logs').insertOne({
    _id: `log-${new mongoose.Types.ObjectId().toHexString()}`,
    timestamp: now.toISOString(),
    userId: 'system',
    userName: 'finance-create-admin script',
    action: existing ? 'RESET_ADMIN_PASSWORD' : 'CREATE_USER',
    entity: 'User',
    entityId: username,
    details: `${existing ? 'Reset' : 'Created'} Super Admin ${name} (${username}) from the command line`,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`${existing ? 'Reset' : 'Created'} finance Super Admin "${username}".`);
  if (generated) {
    console.log(`Password (shown once, hand it over securely): ${password}`);
  }
  console.log('Reference data (chart of accounts, periods, …) is seeded on the first finance API request.');
} finally {
  await mongoose.disconnect();
}
