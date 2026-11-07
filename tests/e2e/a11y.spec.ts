import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { PERSONA } from './persona';

// Fails on serious or critical axe violations, in light and dark, at desktop and mobile (the two projects).

const SCHEMES = ['light', 'dark'] as const;

async function audit(page: Page, context: string) {
  // Let colour transitions settle so axe reads the final colours.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity));
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const bad = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${context}: ${v.id} (${v.impact}) ${v.help}\n  ${v.nodes.slice(0, 5).map((n) => n.target.join(' ')).join('\n  ')}`);
  expect(bad, bad.join('\n')).toEqual([]);
}

/** Opens every "Show as a table" disclosure so the table alternatives are audited too. */
async function openTables(page: Page) {
  for (const d of await page.locator('details').all()) await d.evaluate((el) => ((el as HTMLDetailsElement).open = true));
}

async function saveProfile(page: Page) {
  await page.addInitScript((p) => localStorage.setItem('visaradar.profile.v1', JSON.stringify(p)), PERSONA);
}

const PAGES = ['/', '/states/', '/states/qld/', '/occupations/', '/occupations/233512/', '/me/', '/news/', '/rounds/', '/eoi-check/', '/about/'];

for (const scheme of SCHEMES) {
  test.describe(`${scheme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
    });

    for (const path of PAGES) {
      test(`${path} has no serious a11y violations`, async ({ page, errors }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await openTables(page);
        await audit(page, path);
        void errors;
      });
    }

    test('/me and home with a saved profile', async ({ page, errors }) => {
      await saveProfile(page);
      await page.goto('/me/');
      await expect(page.getByTestId('me-points')).toHaveText(String(PERSONA.points));
      await openTables(page);
      await audit(page, '/me/ (profile)');
      await page.goto('/');
      await expect(page.getByTestId('home-profile')).toContainText(PERSONA.name);
      await audit(page, '/ (profile)');
      await page.goto(`/occupations/${PERSONA.code}/`);
      await page.waitForLoadState('networkidle');
      await openTables(page);
      await audit(page, `/occupations/${PERSONA.code}/ (profile)`);
      void errors;
    });

    test('every map colouring passes, including the change ramp', async ({ page, errors }) => {
      await page.goto('/states/');
      await openTables(page);
      for (const visa of ['190', '491']) {
        await page.locator(`input[name="map-visa"][value="${visa}"]`).check({ force: true });
        for (const metric of ['submitted', 'invited', 'change']) {
          await page.locator(`input[name="map-metric"][value="${metric}"]`).check({ force: true });
          await audit(page, `/states/ ${visa} ${metric}`);
        }
      }
      void errors;
    });
  });
}

/** Contrast checks axe skips: SVG text and chart marks. Runs in the page; returns failures. */
async function svgContrast(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const probe = document.createElement('div');
    document.body.append(probe);
    const rgb = (c: string) => {
      probe.style.color = '';
      probe.style.color = c.trim();
      return (getComputedStyle(probe).color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    };
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a: string, b: string) => {
      const [l1, l2] = [lum(rgb(a)), lum(rgb(b))];
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name);
    const out: string[] = [];
    const check = (what: string, fg: string, bg: string, min: number) => {
      const r = ratio(fg, bg);
      if (r < min) out.push(`${what} ${r.toFixed(2)} < ${min}`);
    };

    // Map: each state label against its own fill; the masked hatch is drawn on --surface-sunk.
    for (const a of document.querySelectorAll('.vr-state')) {
      const shape = a.querySelector('path, rect');
      const text = a.querySelector('text');
      if (!shape || !text) continue;
      const fill = getComputedStyle(shape).fill;
      const bg = fill.startsWith('url') ? token('--surface-sunk') : fill;
      check(`map label ${a.getAttribute('data-state') ?? 'ACT inset'}`, getComputedStyle(text).fill, bg, 4.5);
    }

    // Charts: text at 4.5:1 and marks at 3:1 against the card behind them.
    for (const svg of document.querySelectorAll('svg.chart')) {
      const bg = token('--surface-card');
      for (const t of svg.querySelectorAll('text')) check(`chart text "${t.textContent}"`, getComputedStyle(t).fill, bg, 4.5);
      for (const m of svg.querySelectorAll('.bar')) check(`chart bar ${m.getAttribute('class')}`, getComputedStyle(m).fill, bg, 3);
      for (const m of svg.querySelectorAll('.line-1, .line-2, .bar-masked, .marker-you'))
        check(`chart mark ${m.getAttribute('class')}`, getComputedStyle(m).stroke, bg, 3);
    }
    for (const k of document.querySelectorAll('.chart-legend .key:not(.masked)'))
      check(`legend key ${k.getAttribute('class')}`, getComputedStyle(k).backgroundColor, token('--surface-card'), 3);
    probe.remove();
    return out;
  });
}

for (const scheme of SCHEMES) {
  test(`${scheme}: map labels and chart marks keep their contrast`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/states/');
    for (const visa of ['190', '491']) {
      await page.locator(`input[name="map-visa"][value="${visa}"]`).check({ force: true });
      for (const metric of ['submitted', 'invited', 'change']) {
        await page.locator(`input[name="map-metric"][value="${metric}"]`).check({ force: true });
        expect(await svgContrast(page), `${visa} ${metric}`).toEqual([]);
      }
    }
    await saveProfile(page);
    for (const path of [`/occupations/${PERSONA.code}/`, '/states/qld/', '/occupations/121111/']) {
      await page.goto(path);
      await expect(page.locator('svg.chart').first()).toBeVisible();
      expect(await svgContrast(page), path).toEqual([]);
    }
  });
}

test('the map works from the keyboard', async ({ page, errors }, info) => {
  test.skip(info.project.name === 'mobile', 'keyboard test runs on desktop');
  await page.goto('/states/');
  const nsw = page.locator('a.vr-state[data-state="NSW"]');
  await nsw.focus();
  await expect(nsw).toBeFocused();
  await expect(page.locator('.vr-summary h3')).toHaveText('New South Wales');
  // Arrow keys move between states and update the summary.
  await page.keyboard.press('ArrowRight');
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-state'));
  expect(focused).not.toBe('NSW');
  await expect(page.locator('.vr-summary h3')).not.toHaveText('New South Wales');
  // The focus ring is visible: the focused state's outline differs from the rest.
  const stroke = await page.evaluate(() => getComputedStyle(document.activeElement!.querySelector('path')!).strokeWidth);
  expect(parseFloat(stroke)).toBeGreaterThanOrEqual(3);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/states\/[a-z]+\/$/);
  void errors;
});

test('chart values are reachable without hover', async ({ page, errors }, info) => {
  test.skip(info.project.name === 'mobile', 'keyboard test runs on desktop');
  await page.goto('/occupations/233512/');
  const chart = page.locator('.chart-focus').first();
  await chart.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.chart-tip').first()).toContainText('points:');
  // Every chart has a table alternative.
  for (const path of ['/occupations/233512/', '/states/qld/']) {
    await page.goto(path);
    const charts = await page.locator('svg.chart').count();
    expect(charts).toBeGreaterThan(0);
    expect(await page.locator('details.vr-table table').count()).toBeGreaterThanOrEqual(charts);
  }
  void errors;
});
