import { test, expect } from './fixtures';

test('an occupation page renders its charts', async ({ page, errors }) => {
  await page.goto('/occupations/261313/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Software Engineer');
  const explorer = page.getByTestId('occ-explorer');
  await expect(explorer.locator('svg.chart').first()).toBeVisible();
  await expect(explorer.locator('svg.chart path.bar').first()).toBeAttached();
  await expect(explorer.locator('svg.chart path.line-2')).toBeAttached();
  // Switching visa redraws the histogram.
  await page.getByRole('radio', { name: '189' }).check();
  await expect(page.locator('#pool-title + p')).toContainText('189 Skilled Independent');
  void errors;
});

test('occupation search filters the list', async ({ page, errors }) => {
  await page.goto('/occupations/');
  await page.getByLabel('Search occupations').fill('261313');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody tr a')).toHaveText('Software Engineer');
  void errors;
});
