import { test, expect } from './fixtures';

test('home renders the map with 8 states', async ({ page, errors }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const states = page.locator('.vr-map svg [data-state]');
  await expect(states).toHaveCount(8);
  for (const code of ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']) {
    await expect(page.locator(`[data-state="${code}"]`)).toHaveCount(1);
  }
  await expect(page.getByText(/As at October 2026/).first()).toBeVisible();
  void errors;
});

test('map metric switcher and table alternative work', async ({ page, errors }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Change this month' }).check();
  await expect(page.locator('.legend-title')).toContainText('Change in EOIs submitted');
  await page.getByText('Show the map as a table').click();
  await expect(page.locator('.vr-table table tbody tr')).toHaveCount(9);
  void errors;
});

test('focusing a state shows its summary', async ({ page, errors, isMobile }) => {
  test.skip(isMobile, 'keyboard focus is a desktop check');
  await page.goto('/');
  await page.locator('[data-state="QLD"]').focus();
  await expect(page.locator('.vr-summary h3')).toHaveText('Queensland');
  void errors;
});
