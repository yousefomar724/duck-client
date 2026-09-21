import { afterEach, describe, expect, it, vi } from 'vitest';

const { connect, syncIndexes } = vi.hoisted(() => ({ connect: vi.fn(), syncIndexes: vi.fn().mockResolvedValue(undefined) }));
vi.mock('mongoose', () => ({ default: { connect } }));
vi.mock('@/server/models', () => ({ User: { syncIndexes } }));
import { dbConnect } from '@/server/db/connect';

afterEach(() => {
  global._mongooseConn = undefined;
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('database connection recovery', () => {
  it('retries after a transient connection failure instead of retaining a rejected promise', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost/test');
    connect.mockRejectedValueOnce(new Error('temporary outage')).mockResolvedValueOnce({});
    await expect(dbConnect()).rejects.toThrow('temporary outage');
    await expect(dbConnect()).resolves.toEqual({});
    expect(connect).toHaveBeenCalledTimes(2);
    expect(syncIndexes).toHaveBeenCalledOnce();
  });

  it('shares concurrent connection attempts', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost/test');
    connect.mockResolvedValueOnce({});
    await Promise.all([dbConnect(), dbConnect()]);
    expect(connect).toHaveBeenCalledOnce();
  });
});
