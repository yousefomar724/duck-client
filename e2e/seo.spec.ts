import { test, expect } from '@playwright/test';

test('robots and sitemap respond', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBeTruthy();

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBeTruthy();
});

test('home has metadata', async ({ page }) => {
  await page.goto('/');
  const description = await page.locator('meta[name="description"]').getAttribute('content');
  expect(description).toBeTruthy();
});

test('robots.txt welcomes AI crawlers without exposing private paths', async ({ request }) => {
  const res = await request.get('/robots.txt');
  const body = await res.text();

  expect(body).toContain('User-Agent: GPTBot');
  expect(body).toContain('User-Agent: OAI-SearchBot');
  expect(body).toContain('User-Agent: PerplexityBot');
  expect(body).toContain('Content-Signal: search=yes, ai-input=yes, ai-train=yes');
  expect(body).toContain('Allow: /api/health');
  expect(body).toContain('Allow: /api/mcp');

  // robots.txt has no inheritance — every named-agent block must repeat the
  // disallow list, or that agent falls through to an unfiltered default.
  const blocks = body.split(/User-Agent: /).slice(1);
  for (const block of blocks) {
    expect(block).toContain('Disallow: /admin');
    expect(block).toContain('Disallow: /api');
  }
});

test('sitemap.xml lists trip and destination pages', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  const body = await res.text();

  expect(body).toContain('/trips');
  expect(body).toContain('<lastmod>');
});

test('llms.txt is served as plain text and links to real trips', async ({ request }) => {
  const res = await request.get('/llms.txt');
  expect(res.ok()).toBeTruthy();
  expect(res.headers()['content-type']).toContain('text/plain');

  const body = await res.text();
  expect(body).toContain('## Trips');
  expect(body).toContain('/trips/');
  expect(body).toContain('/book?trip=');
});

test('trips listing page renders real trip cards', async ({ page }) => {
  await page.goto('/trips');
  await expect(page.locator('h1')).toContainText(/Trips/i);
  const firstCard = page.locator('a[href^="/trips/"]').first();
  await expect(firstCard).toBeVisible();
});

test('trip detail page has full server-rendered content and valid JSON-LD', async ({ page, request }) => {
  const sitemapBody = await (await request.get('/sitemap.xml')).text();
  const match = sitemapBody.match(/<loc>[^<]*(\/trips\/[a-z0-9-]+)<\/loc>/);
  expect(match).toBeTruthy();
  const tripPath = match![1];

  await page.goto(tripPath);
  await expect(page.locator('h1')).toBeVisible();

  // Price table must be in the raw HTML, not client-fetched.
  await expect(page.getByText(/EGP/).first()).toBeVisible();

  const jsonLdBlocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(jsonLdBlocks.length).toBeGreaterThan(0);

  const graphs = jsonLdBlocks.map((b) => JSON.parse(b));
  const tripGraph = graphs.find((g) => JSON.stringify(g).includes('AggregateOffer') || JSON.stringify(g).includes('"Offer"'));
  expect(tripGraph).toBeTruthy();

  const serialized = JSON.stringify(tripGraph);
  expect(serialized).toContain('TouristTrip');
  expect(serialized).toContain('"priceCurrency":"EGP"');
});

test('faq page renders visible Q&A matching its FAQPage JSON-LD', async ({ page }) => {
  await page.goto('/faq');
  await expect(page.locator('h1')).toContainText(/FAQ|Everything/i);

  const jsonLdBlocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const graphs = jsonLdBlocks.map((b) => JSON.parse(b));
  const faqGraph = graphs.find((g) => JSON.stringify(g).includes('FAQPage'));
  expect(faqGraph).toBeTruthy();
});

test('trip page book CTA deep-links into the booking form', async ({ page, request }) => {
  const sitemapBody = await (await request.get('/sitemap.xml')).text();
  const match = sitemapBody.match(/<loc>[^<]*(\/trips\/[a-z0-9-]+)<\/loc>/);
  expect(match).toBeTruthy();

  await page.goto(match![1]);
  const bookLink = page.locator('a[href^="/book?trip="]').first();
  const href = await bookLink.getAttribute('href');
  expect(href).toMatch(/^\/book\?trip=[0-9a-f]{24}$/);
});

test('agent discovery documents exist and agree with each other', async ({
  request,
}) => {
  const home = await request.get('/');
  const link = home.headers()['link'] ?? '';
  expect(link).toContain('rel="api-catalog"');
  expect(link).toContain('/openapi.json');
  expect(link).toContain('rel="service-doc"');
  const catalog = await request.get('/.well-known/api-catalog');
  expect(catalog.ok()).toBeTruthy();
  expect(catalog.headers()['content-type']).toContain('application/linkset+json');
  const catalogBody = await catalog.json();
  expect(catalogBody.linkset.length).toBeGreaterThan(0);

  const card = await request.get('/.well-known/mcp/server-card.json');
  expect(card.ok()).toBeTruthy();
  const cardBody = await card.json();
  expect(cardBody.transport.endpoint).toContain('/api/mcp');

  const skills = await request.get('/.well-known/agent-skills/index.json');
  expect(skills.ok()).toBeTruthy();
  const skillsBody = await skills.json();
  for (const skill of skillsBody.skills) {
    const artifact = await request.get(skill.url);
    expect(artifact.ok()).toBeTruthy();
    const bytes = await artifact.text();
    expect(bytes.startsWith('---\nname: ')).toBeTruthy();
  }

  const ard = await request.get('/.well-known/ai-catalog.json');
  expect(ard.ok()).toBeTruthy();
  const ardBody = await ard.json();
  expect(ardBody.entries.length).toBeGreaterThan(0);

  const auth = await request.get('/auth.md');
  expect(auth.ok()).toBeTruthy();
  expect(await auth.text()).toContain('Automated agent registration is not supported');

  const openapi = await request.get('/openapi.json');
  expect(openapi.ok()).toBeTruthy();
  expect((await openapi.json()).openapi).toBe('3.1.0');

  const docs = await request.get('/docs/api');
  expect(docs.ok()).toBeTruthy();
});

test('markdown negotiation on /trips does not break HTML', async ({
  request,
}) => {
  const html = await request.get('/trips');
  expect(html.ok()).toBeTruthy();
  expect(html.headers()['content-type']).toContain('text/html');

  const md = await request.get('/trips', {
    headers: { Accept: 'text/markdown' },
  });
  expect(md.ok()).toBeTruthy();
  expect(md.headers()['content-type']).toContain('text/markdown');
  expect(md.headers()['x-markdown-tokens']).toBeTruthy();
  expect(md.headers()['vary']?.toLowerCase()).toContain('accept');
  const body = await md.text();
  expect(body).toContain('# Trips');
});
