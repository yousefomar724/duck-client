import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

describe('service worker asset recovery', () => {
  async function requestAsset(status: number, range = false) {
    const handlers: Record<string, (event: unknown) => void> = {};
    const put = vi.fn();
    const network = vi.fn().mockResolvedValue(new Response('asset', { status }));
    vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), {
      self: { location: { origin: 'https://duckegy.com' }, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; } },
      caches: { match: vi.fn().mockResolvedValue(undefined), open: vi.fn().mockResolvedValue({ put }) },
      fetch: network,
      URL,
    });
    let response: Promise<Response> | undefined;
    const background: Promise<unknown>[] = [];
    handlers.fetch({
      request: new Request('https://duckegy.com/_next/static/chunks/page.js', { headers: range ? { Range: 'bytes=0-100' } : {} }),
      respondWith: (value: Promise<Response>) => { response = value; },
      waitUntil: (value: Promise<unknown>) => { background.push(value); },
    });
    await response;
    await Promise.all(background);
    return { put, network };
  }

  it.each([404, 500, 503])('does not permanently cache failed JavaScript (%s)', async (status) => {
    expect((await requestAsset(status)).put).not.toHaveBeenCalled();
  });

  it('still caches successful static assets', async () => {
    expect((await requestAsset(200)).put).toHaveBeenCalledOnce();
  });

  it('leaves partial downloads to the browser', async () => {
    expect((await requestAsset(206, true)).network).not.toHaveBeenCalled();
  });
});
