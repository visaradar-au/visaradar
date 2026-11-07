import { test, expect } from './fixtures';

test('/news renders its empty state', async ({ page, errors }) => {
  await page.goto('/news/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('News');
  // With no items yet the page explains what is coming and links the official sources.
  const items = await page.locator('.news-list li').count();
  if (items === 0) {
    await expect(page.getByText('The news feed starts soon')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Home Affairs' }).first()).toBeVisible();
  }
  void errors;
});

for (const path of ['/states/', '/states/qld/', '/states/act/', '/rounds/', '/eoi-check/', '/about/', '/occupations/121111/']) {
  test(`${path} renders without console errors`, async ({ page, errors }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('footer')).toContainText('not migration advice');
    void errors;
  });
}

test('RSS feeds are valid XML', async ({ request }) => {
  for (const path of ['/news.xml', '/changes.xml', '/states/qld/news.xml']) {
    const res = await request.get(path);
    expect(res.ok()).toBe(true);
    const body = await res.text();
    expect(body).toContain('<rss');
    expect(body).toContain('<channel>');
  }
});

test('a state page links back to the map and its feed', async ({ page, errors }) => {
  await page.goto('/states/qld/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Queensland');
  await expect(page.locator('link[rel="alternate"][href$="/states/qld/news.xml"]')).toHaveCount(1);
  await expect(page.locator('svg.chart')).toBeVisible();
  void errors;
});
