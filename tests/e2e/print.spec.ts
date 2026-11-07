import { test, expect } from './fixtures';

for (const path of ['/occupations/233512/', '/states/', '/states/qld/']) {
  test(`${path} prints without nav or controls, with the tables shown`, async ({ page, errors }) => {
    await page.emulateMedia({ media: 'print', colorScheme: 'dark' });
    await page.goto(path);
    await expect(page.locator('svg.chart, .vr-map svg').first()).toBeVisible();
    await expect(page.locator('.site-header nav')).toBeHidden();
    await expect(page.locator('.next')).toBeHidden();
    for (const c of await page.locator('.controls').all()) await expect(c).toBeHidden();
    const tables = page.locator('details.vr-table table');
    expect(await tables.count()).toBeGreaterThan(0);
    for (const t of await tables.all()) await expect(t).toBeVisible();
    for (const s of await page.locator('details.vr-table > summary').all()) await expect(s).toBeHidden();
    // Print is always light, even when the system is dark.
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
    void errors;
  });
}
