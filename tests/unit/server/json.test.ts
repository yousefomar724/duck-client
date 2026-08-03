import { describe, expect, it } from 'vitest';
import { errorResponse, messageResponse } from '@/server/lib/json';

describe('errorResponse', () => {
  it('returns error envelope with status', async () => {
    const res = errorResponse(400, 'bad request');
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'bad request' });
  });
});

describe('messageResponse', () => {
  it('returns message envelope with default 200', async () => {
    const res = messageResponse('ok');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ message: 'ok' });
  });

  it('accepts custom status', async () => {
    const res = messageResponse('created', 201);
    expect(res.status).toBe(201);
  });
});
