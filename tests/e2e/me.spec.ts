import { test, expect } from './fixtures';

test('/me profile persists across reload', async ({ page, errors }) => {
  await page.goto('/me/');
  await page.getByLabel('Occupation', { exact: true }).fill('261313');
  await page.getByLabel('Visa', { exact: true }).selectOption('190');
  await page.getByLabel('State', { exact: true }).selectOption('QLD');
  await page.getByLabel('Points', { exact: true }).fill('85');
  await page.getByRole('button', { name: 'Show where I stand' }).click();
  await expect(page.getByTestId('me-points')).toHaveText('85');
  await expect(page.locator('.position-card').first()).toContainText('Queensland');

  await page.reload();
  await expect(page.getByTestId('me-points')).toHaveText('85');
  await expect(page.locator('.position-card[data-scope="QLD"]')).toContainText('EOIs above your score');
  await expect(page.locator('.position-card[data-scope="QLD"]')).toContainText('masked');

  // The home page shows the saved summary.
  await page.goto('/');
  await expect(page.getByTestId('home-profile')).toContainText('Software Engineer');

  await page.goto('/me/');
  await page.getByRole('button', { name: 'Clear my details' }).click();
  await expect(page.getByRole('button', { name: 'Show where I stand' })).toBeVisible();
  void errors;
});

test('/me shows a clear error for an unknown occupation', async ({ page, errors }) => {
  await page.goto('/me/');
  await page.getByLabel('Occupation', { exact: true }).fill('not a job');
  await page.getByLabel('Points', { exact: true }).fill('80');
  await page.getByRole('button', { name: 'Show where I stand' }).click();
  await expect(page.getByText('Pick an occupation from the list')).toBeVisible();
  void errors;
});
