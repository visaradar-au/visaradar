import type { Browser } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { PERSONA } from './persona';

// Regenerates docs/screenshots/ with the made-up PERSONA. Skipped unless SCREENSHOTS=1 (`npm run screenshots`).
test.skip(!process.env.SCREENSHOTS, 'set SCREENSHOTS=1 to regenerate docs/screenshots');

const SIZES = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true },
] as const;

async function contextFor(browser: Browser, size: (typeof SIZES)[number], baseURL: string | undefined) {
  const context = await browser.newContext({
    baseURL,
    viewport: size.viewport,
    deviceScaleFactor: 1,
    isMobile: size.isMobile,
    hasTouch: size.isMobile,
    colorScheme: 'light',
  });
  await context.addInitScript((p) => localStorage.setItem('visaradar.profile.v1', JSON.stringify(p)), PERSONA);
  return context;
}

for (const size of SIZES) {
  test(`screenshots at ${size.name}`, async ({ browser, baseURL }, info) => {
    test.skip(info.project.name !== 'desktop', 'one run makes both sizes');
    const context = await contextFor(browser, size, baseURL);
    const page = await context.newPage();
    const shot = (name: string) => page.screenshot({ path: `docs/screenshots/${name}-${size.name}.png`, fullPage: true, animations: 'disabled' });

    await page.goto('/');
    await expect(page.getByTestId('home-profile')).toContainText(PERSONA.name);
    await page.waitForLoadState('networkidle');
    await shot('home');

    await page.goto('/me/');
    await expect(page.getByTestId('me-points')).toHaveText(String(PERSONA.points));
    await shot('me');

    await page.goto(`/states/${PERSONA.state.toLowerCase()}/`);
    await expect(page.locator('svg.chart').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    await shot('state');

    // The occupation page set to the persona's visa and state, so the "your points" bar shows.
    await page.goto(`/occupations/${PERSONA.code}/`);
    await page.locator(`input[name="occ-visa"][value="${PERSONA.visa}"]`).check({ force: true });
    await page.getByLabel('State', { exact: true }).selectOption(PERSONA.state);
    await expect(page.locator('.chart .bar.you')).toHaveCount(1);
    await page.waitForLoadState('networkidle');
    await shot('occupation');

    await context.close();
  });
}
