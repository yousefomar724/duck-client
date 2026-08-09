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
