import { gzipSync } from 'node:zlib';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

// Search palette, /movers/, per-occupation and per-state feeds, and the "Data checked" line.

const palette = (page: Page) => page.locator('dialog[data-search-dialog]');
const box = (page: Page) => page.getByRole('combobox', { name: /Search the whole site/ });

test.describe('search palette', () => {
  test('opens with "/", finds a code and goes there with Enter', async ({ page, errors }) => {
    await page.goto('/');
    await page.locator('body').press('/');
    await expect(palette(page)).toBeVisible();
    await expect(box(page)).toBeFocused();
    await box(page).fill('261313');
    const first = page.getByRole('option').first();
    await expect(first).toContainText('Software Engineer');
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(box(page)).toHaveAttribute('aria-activedescendant', (await first.getAttribute('id'))!);
    await box(page).press('Enter');
    await expect(page).toHaveURL(/\/occupations\/261313\/$/);
    void errors;
  });

  test('Ctrl+K opens, arrows move, Tab stays inside, Esc closes and returns focus', async ({ page, errors }) => {
    await page.goto('/states/');
    const trigger = page.locator('[data-search-open]');
    await trigger.focus();
    await page.keyboard.press('Control+k');
    await expect(palette(page)).toBeVisible();
    await box(page).fill('queensland');
    await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
    await box(page).press('ArrowDown');
    await expect(page.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true');
    await box(page).press('ArrowUp');
    await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-search-close]')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(box(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(palette(page)).toBeHidden();
    await expect(trigger).toBeFocused();
    void errors;
  });

  test('"/" typed into a field does not open it', async ({ page, errors }) => {
    await page.goto('/occupations/');
    await page.locator('#occ-q').fill('');
    await page.locator('#occ-q').press('/');
    await expect(palette(page)).toBeHidden();
    await expect(page.locator('#occ-q')).toHaveValue('/');
    void errors;
  });

  test('works by tap: open, pick a state', async ({ page, errors }, info) => {
    await page.goto('/news/');
    const trigger = page.locator('[data-search-open]');
    await expect(trigger).toBeVisible();
    const touch = info.project.name === 'mobile';
    await (touch ? trigger.tap() : trigger.click());
    await expect(palette(page)).toBeVisible();
    // Empty box offers the main pages.
    await expect(page.getByRole('option', { name: /Top movers/ })).toBeVisible();
    await box(page).fill('south aus');
    const opt = page.getByRole('option', { name: /South Australia/ }).first();
    await (touch ? opt.tap() : opt.click());
    await expect(page).toHaveURL(/\/states\/sa\/$/);
    void errors;
  });

  test('says so when nothing matches', async ({ page, errors }) => {
    await page.goto('/');
    await page.locator('[data-search-open]').click();
    await box(page).fill('zzqxv');
    await expect(page.locator('[data-search-status]')).toContainText('No matches');
    await expect(box(page)).toHaveAttribute('aria-expanded', 'false');
    void errors;
  });

  test('the index is small and lists every kind', async ({ request }) => {
    const res = await request.get('/search-index.json');
    expect(res.ok()).toBe(true);
    const body = await res.body();
    expect(gzipSync(body).length).toBeLessThan(60_000);
    const kinds = new Set((JSON.parse(body.toString()).items as string[][]).map((e) => e[0]));
    expect([...kinds].sort()).toEqual(['n', 'o', 'p', 's', 'v']);
  });
});

test.describe('/movers/', () => {
  test('lists moves, filters by visa and state, links each row', async ({ page, errors }) => {
    await page.goto('/movers/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Top movers');
    await expect(page.getByText('not the number of invitations issued')).toBeVisible();
    const rows = page.locator('[data-movers-rows] tr:not([hidden])');
    expect(await rows.count()).toBeGreaterThan(0);
    await page.getByLabel('Visa', { exact: true }).selectOption('190');
    await page.getByLabel('State', { exact: true }).selectOption('QLD');
    await expect(page.locator('[data-movers-count]')).toContainText(/Showing|No numeric moves/);
    for (const tr of await rows.all()) {
      await expect(tr).toHaveAttribute('data-visa', '190');
      await expect(tr).toHaveAttribute('data-state', 'QLD');
    }
    await page.getByLabel('Visa', { exact: true }).selectOption('');
    await page.getByLabel('State', { exact: true }).selectOption('');
    const link = rows.first().getByRole('link');
    const target = await link.getAttribute('href');
    expect(target).toMatch(/\/occupations\/\d{6}\/$/);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${target}$`));
    void errors;
  });

  test('home shows the top five and links to /movers/', async ({ page, errors }) => {
    await page.goto('/');
    const section = page.locator('section:has(#movers-title)');
    await expect(section.locator('ol li')).toHaveCount(5);
    await expect(section).toContainText('invited status');
    await section.getByRole('link', { name: /All top movers/ }).click();
    await expect(page).toHaveURL(/\/movers\/$/);
    void errors;
  });
});

test.describe('feeds', () => {
  async function parse(page: Page, path: string) {
    const res = await page.request.get(path);
    expect(res.ok(), path).toBe(true);
    const text = await res.text();
    return page.evaluate((xml) => {
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const items = [...doc.querySelectorAll('item')];
      return {
        error: doc.querySelector('parsererror')?.textContent ?? null,
        root: doc.documentElement.nodeName,
        titles: items.map((i) => i.querySelector('title')?.textContent ?? ''),
        descriptions: items.map((i) => i.querySelector('description')?.textContent ?? ''),
        guids: items.map((i) => i.querySelector('guid')?.textContent ?? ''),
      };
    }, text);
  }

  test('every feed parses as XML', async ({ page }) => {
    await page.goto('/');
    for (const path of ['/news.xml', '/changes.xml', '/states/qld/news.xml', '/states/nt/news.xml', '/occupations/261313/feed.xml', '/occupations/121111/feed.xml']) {
      const f = await parse(page, path);
      expect(f.error, path).toBeNull();
      expect(f.root, path).toBe('rss');
      expect(new Set(f.guids.filter(Boolean)).size, `${path} guids unique`).toBe(f.guids.filter(Boolean).length);
    }
  });

  test('a state feed carries its SkillSelect month changes', async ({ page }) => {
    await page.goto('/');
    const f = await parse(page, '/states/nt/news.xml');
    expect(f.titles.some((t) => t.includes('EOIs in invited status'))).toBe(true);
    expect(f.titles.some((t) => /Tasmania|Queensland|WA,/.test(t))).toBe(false);
  });

  test('an occupation feed words its moves as month-end status', async ({ page }) => {
    await page.goto('/');
    const f = await parse(page, '/occupations/261313/feed.xml');
    expect(f.titles.length).toBeGreaterThan(0);
    expect(f.titles.length).toBeLessThanOrEqual(12);
    for (const d of f.descriptions) {
      expect(d).toContain('EOIs in invited status at month end');
      expect(d).toContain('not invitations issued');
    }
  });

  test('pages link their feed visibly with an explainer', async ({ page, errors }) => {
    await page.goto('/occupations/261313/');
    await expect(page.locator('link[rel="alternate"][href$="/occupations/261313/feed.xml"]')).toHaveCount(1);
    const link = page.getByRole('link', { name: /Get updates for this by RSS/ });
    await expect(link).toHaveAttribute('href', /\/occupations\/261313\/feed\.xml$/);
    await expect(page.getByText('RSS-to-email service')).toBeVisible();
    await page.goto('/states/nt/');
    await expect(page.getByRole('link', { name: /Get updates for this by RSS/ })).toHaveAttribute('href', /\/states\/nt\/news\.xml$/);
    void errors;
  });
});

test('footer says when the data was checked', async ({ page, errors }) => {
  await page.goto('/about/');
  const line = page.getByTestId('freshness');
  await expect(line).toContainText(/Data checked \(Brisbane time\): news \d{2}:\d{2}, \d{1,2} \w{3} · states \d{2}:\d{2}/);
  await expect(line).toContainText(/SkillSelect \d{2}:\d{2}, \d{1,2} \w{3} \(published \d{1,2} \w{3} \d{4}\)/);
  void errors;
});

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
    });

    async function audit(page: Page, context: string, include?: string) {
      await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity));
      let axe = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
      if (include) axe = axe.include(include);
      const { violations } = await axe.analyze();
      const bad = violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${context}: ${v.id} (${v.impact}) ${v.help}\n  ${v.nodes.slice(0, 5).map((n) => n.target.join(' ')).join('\n  ')}`);
      expect(bad, bad.join('\n')).toEqual([]);
    }

    test('/movers/ and the home teaser have no serious a11y violations', async ({ page, errors }) => {
      await page.goto('/movers/');
      await audit(page, '/movers/');
      await page.goto('/');
      await audit(page, '/ movers teaser', 'section:has(#movers-title)');
      void errors;
    });

    test('the open search palette has no serious a11y violations', async ({ page, errors }) => {
      await page.goto('/');
      await page.locator('[data-search-open]').click();
      await expect(page.getByRole('option').first()).toBeVisible();
      await audit(page, 'palette (empty)', 'dialog[data-search-dialog]');
      await box(page).fill('nurse');
      await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
      await audit(page, 'palette (results)', 'dialog[data-search-dialog]');
      void errors;
    });

    test('feed link and freshness line pass', async ({ page, errors }) => {
      await page.goto('/occupations/261313/');
      await audit(page, 'feed link', '.feedlink');
      await audit(page, 'freshness', '[data-testid="freshness"]');
      void errors;
    });
  });
}
